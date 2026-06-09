/**
 * Top-level route-transition loader (TSK-153, Part C).
 *
 * Shown by Next's Suspense boundary while a server segment streams in. Renders
 * the branded IngredientLoader in a centered, fading kale-50 wash. Segments with
 * their own loading.tsx (e.g. /account, /byw) keep their tailored skeletons.
 */
import { getServerLang } from "@/lib/lang-server";
import IngredientLoader from "@/lib/components/IngredientLoader.client";

export default function RootLoading() {
  return <IngredientLoader overlay lang={getServerLang()} />;
}
