import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { normalizeMadridCenterRecord } from "../../packages/ingestion/src/normalizers/center";
import {
  containsSuspiciousText,
  findSuspiciousTextEntries,
  normalizeSourceText,
} from "../../packages/ingestion/src/text";
import { loadBicimadStationNodes } from "../../packages/mobility/src/sources/bicimadStations";
import { loadParkingNodes } from "../../packages/mobility/src/sources/parkings";

type NormalizationFixture = {
  name: string;
  input: string;
  expected: string;
};

function toLatin1ArrayBuffer(value: string): ArrayBuffer {
  const buffer = Buffer.from(value, "latin1");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function loadNormalizationFixtures(): NormalizationFixture[] {
  const fixturePath = path.join(process.cwd(), "tests", "fixtures", "text", "normalization.json");
  return JSON.parse(readFileSync(fixturePath, "utf8")) as NormalizationFixture[];
}

test("normalizeSourceText sanea fixtures de utf8, entidades HTML y mojibake real", () => {
  const fixtures = loadNormalizationFixtures();

  assert.ok(fixtures.length >= 4);

  for (const fixture of fixtures) {
    assert.equal(normalizeSourceText(fixture.input), fixture.expected, fixture.name);
  }
});

test("normalizeSourceText decodifica entidades HTML sin tocar texto sano", () => {
  assert.equal(normalizeSourceText("VI&amp;Ntilde;A VIRGEN"), "VI\u00d1A VIRGEN");
  assert.equal(
    normalizeSourceText("Sala de estudio Luis Garc\u00eda Berlanga"),
    "Sala de estudio Luis Garc\u00eda Berlanga",
  );
});

test("normalizeSourceText repara mojibake UTF-8/latin1 real", () => {
  assert.equal(normalizeSourceText("Malasa\u00c3\u00b1a"), "Malasa\u00f1a");
  assert.equal(
    normalizeSourceText("Jos\u00c3\u00a9 Cast\u00c3\u00a1n Tobe\u00c3\u00b1as"),
    "Jos\u00e9 Cast\u00e1n Tobe\u00f1as",
  );
  assert.equal(
    normalizeSourceText("Caf\u00e9 &amp; Co. Malasa\u00c3\u00b1a \u00c2\u00b7 Centro"),
    "Caf\u00e9 & Co. Malasa\u00f1a \u00b7 Centro",
  );
});

test("normalizeSourceText no hace doble decode sobre texto ya sano", () => {
  assert.equal(normalizeSourceText("AT&T"), "AT&T");
  assert.equal(normalizeSourceText("Rock &amp; Roll"), "Rock & Roll");
  assert.equal(normalizeSourceText("Rock & Roll"), "Rock & Roll");
});

test("normalizeSourceText es idempotente para utf8, entidades, mojibake y casos mixtos", () => {
  const cases = [
    "Sala de estudio Luis Garc\u00eda Berlanga",
    "Malasa\u00c3\u00b1a",
    "VI&amp;Ntilde;A VIRGEN",
    "Caf\u0065\u0301 &amp; Co. Malasa\u00c3\u00b1a \u00c2\u00b7 Centro",
  ];

  for (const input of cases) {
    const once = normalizeSourceText(input);
    const twice = normalizeSourceText(once);
    assert.equal(twice, once, input);
  }
});

test("containsSuspiciousText y findSuspiciousTextEntries detectan mojibake sin mutar payloads", () => {
  assert.equal(containsSuspiciousText("Malasa\u00c3\u00b1a"), true);
  assert.equal(containsSuspiciousText("Malasa\u00f1a"), false);
  assert.equal(containsSuspiciousText("Caf\u00e9 \u00b7 Centro"), false);

  const findings = findSuspiciousTextEntries({
    items: [
      { name: "Malasa\u00c3\u00b1a", safe: "Centro" },
      { address: "Calle Gran V\u00eda" },
    ],
  });

  assert.deepEqual(findings, [
    {
      field: "items[0].name",
      rawSnippet: "Malasa\u00c3\u00b1a",
    },
  ]);
});

test("normalizeMadridCenterRecord persiste direcciones HTML como texto real", () => {
  const normalized = normalizeMadridCenterRecord(
    {
      PK: "6468021",
      NOMBRE: "Sala de estudio Luis Garc\u00c3\u00ada Berlanga (Tetu\u00c3\u00a1n)",
      DISTRITO: "TETUAN",
      BARRIO: "ALMENARA",
      "CLASE-VIAL": "CALLE",
      "NOMBRE-VIA": "VI&amp;Ntilde;A VIRGEN",
      NUM: "2",
      "CODIGO-POSTAL": "28029",
      LOCALIDAD: "MADRID",
      TELEFONO: "915 133 253",
      EMAIL: "",
      "CONTENT-URL": "",
      LATITUD: "40,4652835",
      LONGITUD: "-3,6940600",
      EQUIPAMIENTO: "",
      DESCRIPCION: "",
      HORARIO: "",
      ACCESIBILIDAD: "1",
    },
    {
      sourceCode: "study_rooms",
      sourceId: "study_rooms",
      kind: "study_room",
      sourceRecordUpdatedAt: null,
    },
  );

  assert.ok(normalized);
  assert.equal(normalized?.center.address_line, "CALLE VI\u00d1A VIRGEN 2");
});

test("loadParkingNodes sanea nombres con mojibake antes de persistir", async () => {
  const onceMojibake = Buffer.from("Jos\u00e9 Cast\u00e1n Tobe\u00f1as", "utf8").toString("latin1");
  const csv = [
    "id,name,address,long,lat,isEmtParking,Plazas_standard,Plazas_PMR",
    `30,${onceMojibake},CALLE JOSE CASTAN TOBENAS 1,-3.69225,40.46473,Y,100,4`,
  ].join("\n");

  const rows = await loadParkingNodes(async () =>
    new Response(toLatin1ArrayBuffer(csv), {
      status: 200,
      headers: { "content-type": "text/csv; charset=windows-1252" },
    }),
  );

  assert.equal(rows[0]?.name, "Jos\u00e9 Cast\u00e1n Tobe\u00f1as");
});

test("loadBicimadStationNodes sanea nombres JSON con mojibake antes de persistir", async () => {
  const mockFetch: typeof fetch = async (input) => {
    const url = String(input);

    if (url.endsWith("/gbfs.json")) {
      return new Response(JSON.stringify({
        data: {
          es: {
            feeds: [
              { name: "station_information", url: "https://mock/station_information.json" },
              { name: "station_status", url: "https://mock/station_status.json" },
            ],
          },
        },
      }), { status: 200 });
    }

    if (url.endsWith("/station_information.json")) {
      return new Response(JSON.stringify({
        data: {
          stations: [
            {
              station_id: "4",
              short_name: "4",
              name: "4 - Malasa\u00c3\u00b1a",
              address: "Calle Manuela Malasa\u00c3\u00b1a",
              post_code: "28004",
              lat: 40.1,
              lon: -3.7,
              capacity: 24,
            },
          ],
        },
      }), { status: 200 });
    }

    if (url.endsWith("/station_status.json")) {
      return new Response(JSON.stringify({
        data: {
          stations: [
            {
              station_id: "4",
              num_bikes_available: 12,
              num_docks_available: 10,
              status: "IN_SERVICE",
              last_reported: 1712300000,
              is_renting: true,
              is_returning: true,
            },
          ],
        },
      }), { status: 200 });
    }

    return new Response("not found", { status: 404 });
  };

  const rows = await loadBicimadStationNodes(mockFetch);

  assert.equal(rows[0]?.name, "4 - Malasa\u00f1a");
  assert.equal(rows[0]?.address_line, "Calle Manuela Malasa\u00f1a 28004");
});
