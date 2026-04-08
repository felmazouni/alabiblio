import { useParams } from "react-router-dom";
import { CenterDetailScreen } from "../components/CenterDetailScreen";
import { useCenterDetailRoute } from "../hooks/useCenterDetailRoute";

export function CenterDetailRoute() {
  const { slug } = useParams<{ slug: string }>();
  const {
    origin,
    detail,
    detailScope,
    mobility,
    mobilityScope,
    loading,
    mobilityLoading,
    mobilityError,
    detailError,
  } = useCenterDetailRoute(slug);

  return (
    <CenterDetailScreen
      item={detail}
      detailScope={detailScope}
      mobility={mobility}
      mobilityScope={mobilityScope}
      origin={origin}
      loading={loading}
      mobilityLoading={mobilityLoading}
      mobilityError={mobilityError}
      error={detailError}
    />
  );
}
