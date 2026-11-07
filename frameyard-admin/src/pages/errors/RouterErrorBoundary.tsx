import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import RouteErrorPage from './RouteErrorPage';
import UnexpectedErrorPage from './UnexpectedErrorPage';
import { ResourceNotFoundError } from '../../utils/resource-not-found';
export default function RouterErrorBoundary() {
  const error = useRouteError();
  return error instanceof ResourceNotFoundError || (isRouteErrorResponse(error) && error.status === 404)
    ? <RouteErrorPage /> : <UnexpectedErrorPage />;
}
