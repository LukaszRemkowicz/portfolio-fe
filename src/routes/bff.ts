import type { Route } from './+types/bff';
import { handleBffRequest } from '../server/bff/proxy';

export function loader({ request, context }: Route.LoaderArgs) {
  return handleBffRequest(request, context.requestId);
}

export function action({ request, context }: Route.ActionArgs) {
  return handleBffRequest(request, context.requestId);
}
