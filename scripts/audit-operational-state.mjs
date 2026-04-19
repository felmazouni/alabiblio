const BASE = "https://alabiblio-preview.ttefmb.workers.dev";

function madridNowParts(referenceDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[values.weekday ?? "Mon"] ?? 1,
    hour: Number(values.hour ?? "0"),
    minute: Number(values.minute ?? "0"),
    day: values.day ?? "01",
    month: values.month ?? "01",
    year: values.year ?? "1970",
  };
}

function toMinutes(value) {
  const [hours, minutes] = String(value ?? "").split(":").map((part) => Number(part));
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function formatTimeFromIso(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function expectedHeadlineStatus(isOpenNow) {
  if (isOpenNow === true) {
    return "Abierta";
  }

  if (isOpenNow === false) {
    return "Cerrada";
  }

  return "Revision manual";
}

function expectedScheduleLabel(schedule) {
  const nextChange = formatTimeFromIso(schedule.nextChangeAt);

  if (schedule.isOpenNow === true) {
    return nextChange ? `Abierta hasta ${nextChange}` : "Abierta ahora";
  }

  if (schedule.isOpenNow === false) {
    return nextChange ? `Abre a las ${nextChange}` : "Cerrada ahora";
  }

  return schedule.todaySummary ?? schedule.displayText ?? "Horario pendiente de revision";
}

function isValidTime(value) {
  if (!/^\d{2}:\d{2}$/.test(String(value ?? ""))) {
    return false;
  }

  const hours = Number(String(value).slice(0, 2));
  const minutes = Number(String(value).slice(3, 5));
  return Number.isFinite(hours) && Number.isFinite(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function uniqueRules(rules) {
  const seen = new Set();
  return rules
    .filter((rule) => {
      const key = `${rule.weekday}:${rule.opensAt}:${rule.closesAt}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.weekday - right.weekday || toMinutes(left.opensAt) - toMinutes(right.opensAt));
}

function mergeRecurringOverrides(baseRules, overrides) {
  const recurringRules = (overrides ?? [])
    .filter((override) => !override.closed && !override.fromDate && !override.toDate && Array.isArray(override.rules) && override.rules.length > 0)
    .flatMap((override) => override.rules);

  if (recurringRules.length === 0) {
    return baseRules ?? [];
  }

  const recurringWeekdays = new Set(recurringRules.map((rule) => rule.weekday));
  const preservedBaseRules = (baseRules ?? []).filter((rule) => !recurringWeekdays.has(rule.weekday));
  return uniqueRules([...preservedBaseRules, ...recurringRules]);
}

function detectActiveOverride(overrides, dateParts) {
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  return (
    (overrides ?? []).find((override) => {
      if (!override.fromDate || !override.toDate) {
        return false;
      }

      return today >= override.fromDate && today <= override.toDate;
    }) ?? null
  );
}

function formatIsoMadrid(dateParts, time) {
  const [hours, minutes] = String(time ?? "00:00").split(":").map((part) => Number(part));
  const probeDate = new Date(
    Date.UTC(
      Number(dateParts.year),
      Number(dateParts.month) - 1,
      Number(dateParts.day),
      Number.isFinite(hours) ? hours : 0,
      Number.isFinite(minutes) ? minutes : 0,
      0,
    ),
  );
  const offsetText = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  })
    .formatToParts(probeDate)
    .find((part) => part.type === "timeZoneName")?.value;
  const normalized = (offsetText ?? "+01:00").replace("GMT", "");
  const match = normalized.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  const sign = match?.[1] ?? "+";
  const hh = String(match?.[2] ?? "01").padStart(2, "0");
  const mm = String(match?.[3] ?? "00").padStart(2, "0");
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${time}:00${sign}${hh}:${mm}`;
}

function addDaysMadrid(dateParts, offsetDays) {
  const seed = new Date(Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day), 12, 0, 0));
  const shifted = new Date(seed.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const values = Object.fromEntries(formatter.formatToParts(shifted).map((part) => [part.type, part.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: weekdayMap[values.weekday ?? "Mon"] ?? 1,
    day: values.day ?? "01",
    month: values.month ?? "01",
    year: values.year ?? "1970",
  };
}

function computeExpectedOpenState(schedule, madridNow) {
  const activeOverride = detectActiveOverride(schedule.overrides ?? [], madridNow);

  if (activeOverride?.closed) {
    return {
      isOpenNow: false,
      nextChangeAt: activeOverride.toDate ? `${activeOverride.toDate}T00:00:00+01:00` : null,
      nextOpening: null,
      todaySummary: activeOverride.label,
    };
  }

  const baselineRules = mergeRecurringOverrides(schedule.rules ?? [], schedule.overrides ?? []);
  const effectiveRules = activeOverride?.rules?.length ? activeOverride.rules : baselineRules;

  if (effectiveRules.length === 0) {
    return {
      isOpenNow: null,
      nextChangeAt: null,
      nextOpening: null,
      todaySummary: null,
    };
  }

  const currentMinutes = madridNow.hour * 60 + madridNow.minute;
  const todayRules = effectiveRules
    .filter((rule) => rule.weekday === madridNow.weekday)
    .sort((left, right) => toMinutes(left.opensAt) - toMinutes(right.opensAt));
  const todaySummary = buildTodaySummary(effectiveRules, madridNow.weekday);
  const currentRule = todayRules.find(
    (rule) => currentMinutes >= toMinutes(rule.opensAt) && currentMinutes < toMinutes(rule.closesAt),
  );

  if (currentRule) {
    return {
      isOpenNow: true,
      nextChangeAt: formatIsoMadrid(madridNow, currentRule.closesAt),
      nextOpening: null,
      todaySummary,
    };
  }

  const nextTodayRule = todayRules.find((rule) => currentMinutes < toMinutes(rule.opensAt));
  if (nextTodayRule) {
    const nextOpening = formatIsoMadrid(madridNow, nextTodayRule.opensAt);
    return {
      isOpenNow: false,
      nextChangeAt: nextOpening,
      nextOpening,
      todaySummary,
    };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDaysMadrid(madridNow, offset);
    const nextRule = effectiveRules
      .filter((rule) => rule.weekday === candidate.weekday)
      .sort((left, right) => toMinutes(left.opensAt) - toMinutes(right.opensAt))[0];

    if (!nextRule) {
      continue;
    }

    const nextOpening = formatIsoMadrid(candidate, nextRule.opensAt);
    return {
      isOpenNow: false,
      nextChangeAt: nextOpening,
      nextOpening,
      todaySummary,
    };
  }

  return {
    isOpenNow: false,
    nextChangeAt: null,
    nextOpening: null,
    todaySummary,
  };
}

function buildTodaySummary(rules, weekday) {
  const todayRules = (rules ?? [])
    .filter((rule) => rule.weekday === weekday)
    .sort((left, right) => toMinutes(left.opensAt) - toMinutes(right.opensAt));

  if (todayRules.length === 0) {
    return null;
  }

  const weekdayLabel = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][weekday] ?? "dia";
  const ranges = todayRules.map((rule) => `${rule.opensAt}-${rule.closesAt}`);
  return `${weekdayLabel}: ${ranges.join(" / ")}`;
}

function auditScheduleConsistency(center, madridNow) {
  const schedule = center.schedule ?? {};
  const issues = [];
  const centerId = center.id ?? center.slug ?? center.name;

  const expectedOpenState = computeExpectedOpenState(schedule, madridNow);

  if ((schedule.isOpenNow ?? null) !== (expectedOpenState.isOpenNow ?? null)) {
    issues.push({
      type: "is_open_now_mismatch",
      centerId,
      expected: expectedOpenState.isOpenNow ?? null,
      actual: schedule.isOpenNow ?? null,
    });
  }

  const expectedHeadline = expectedHeadlineStatus(expectedOpenState.isOpenNow);
  if (center.headlineStatus !== expectedHeadline) {
    issues.push({ type: "headline_mismatch", centerId, expected: expectedHeadline, actual: center.headlineStatus });
  }

  const expectedLabel = expectedScheduleLabel({ ...schedule, ...expectedOpenState });
  if (center.scheduleLabel !== expectedLabel) {
    issues.push({ type: "schedule_label_mismatch", centerId, expected: expectedLabel, actual: center.scheduleLabel });
  }

  const expectedTodaySummary = expectedOpenState.todaySummary;
  if ((schedule.todaySummary ?? null) !== (expectedTodaySummary ?? null)) {
    issues.push({
      type: "today_summary_mismatch",
      centerId,
      expected: expectedTodaySummary,
      actual: schedule.todaySummary ?? null,
    });
  }

  for (const rule of schedule.rules ?? []) {
    if (!isValidTime(rule.opensAt) || !isValidTime(rule.closesAt)) {
      issues.push({ type: "invalid_regular_rule_time", centerId, opensAt: rule.opensAt, closesAt: rule.closesAt });
    }
  }

  for (const override of schedule.overrides ?? []) {
    for (const rule of override.rules ?? []) {
      if (!isValidTime(rule.opensAt) || !isValidTime(rule.closesAt)) {
        issues.push({
          type: "invalid_override_rule_time",
          centerId,
          overrideLabel: override.label,
          opensAt: rule.opensAt,
          closesAt: rule.closesAt,
        });
      }
    }
  }

  if (schedule.nextChangeAt) {
    const parsed = new Date(schedule.nextChangeAt);
    if (Number.isNaN(parsed.getTime())) {
      issues.push({ type: "invalid_next_change_at", centerId, value: schedule.nextChangeAt });
    }
  }

  if (schedule.nextOpening) {
    const parsed = new Date(schedule.nextOpening);
    if (Number.isNaN(parsed.getTime())) {
      issues.push({ type: "invalid_next_opening", centerId, value: schedule.nextOpening });
    }
  }

  if (schedule.isOpenNow === true && schedule.nextOpening !== null) {
    issues.push({ type: "open_center_with_next_opening", centerId, nextOpening: schedule.nextOpening });
  }

  if (schedule.isOpenNow === false && schedule.nextOpening && schedule.nextChangeAt !== schedule.nextOpening) {
    issues.push({
      type: "closed_center_next_change_not_equal_next_opening",
      centerId,
      nextChangeAt: schedule.nextChangeAt,
      nextOpening: schedule.nextOpening,
    });
  }

  return issues;
}

async function fetchJson(path, attempts = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(path, {
        headers: {
          "cache-control": "no-cache",
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`http_${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  }

  throw lastError;
}

async function run() {
  const madridNow = madridNowParts();
  const catalog = await fetchJson(`${BASE}/api/public/catalog?limit=500&_t=${Date.now()}`, 6);
  const items = catalog.items ?? [];
  const issues = [];

  for (const item of items) {
    issues.push(...auditScheduleConsistency(item, madridNow));

    if (!item.slug) {
      issues.push({ type: "missing_slug_for_detail_validation", centerId: item.id ?? item.name });
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, 45));

    let detail = null;
    try {
      detail = await fetchJson(`${BASE}/api/public/centers/${item.slug}?_t=${Date.now() + 1}`, 4);
    } catch (error) {
      issues.push({
        type: "detail_endpoint_error",
        centerId: item.id ?? item.slug,
        slug: item.slug,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    const detailCenter = detail?.item?.center ?? null;

    if (!detailCenter) {
      issues.push({ type: "detail_missing_center_payload", centerId: item.id ?? item.slug, slug: item.slug });
      continue;
    }

    if (detailCenter.headlineStatus !== item.headlineStatus) {
      issues.push({
        type: "catalog_detail_headline_divergence",
        centerId: item.id ?? item.slug,
        catalog: item.headlineStatus,
        detail: detailCenter.headlineStatus,
      });
    }

    if (detailCenter.scheduleLabel !== item.scheduleLabel) {
      issues.push({
        type: "catalog_detail_schedule_label_divergence",
        centerId: item.id ?? item.slug,
        catalog: item.scheduleLabel,
        detail: detailCenter.scheduleLabel,
      });
    }

    if ((detailCenter.schedule?.isOpenNow ?? null) !== (item.schedule?.isOpenNow ?? null)) {
      issues.push({
        type: "catalog_detail_is_open_divergence",
        centerId: item.id ?? item.slug,
        catalog: item.schedule?.isOpenNow ?? null,
        detail: detailCenter.schedule?.isOpenNow ?? null,
      });
    }

    if ((detailCenter.schedule?.todaySummary ?? null) !== (item.schedule?.todaySummary ?? null)) {
      issues.push({
        type: "catalog_detail_today_summary_divergence",
        centerId: item.id ?? item.slug,
        catalog: item.schedule?.todaySummary ?? null,
        detail: detailCenter.schedule?.todaySummary ?? null,
      });
    }
  }

  const byType = issues.reduce((acc, issue) => {
    const key = issue.type;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const summary = {
    auditedCenters: items.length,
    madridNow,
    totalInconsistencies: issues.length,
    byType,
    sample: issues.slice(0, 20),
  };

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
