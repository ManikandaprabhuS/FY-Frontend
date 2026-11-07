import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { isResourceId, resourcePath, ResourceNotFoundError, subscribeToMissingResources } from '../../utils/resource-not-found';

function ResourceRequestBoundary({ path, children }: { path: string; children: ReactNode }) {
  const [missing, setMissing] = useState(false);
  useEffect(() => subscribeToMissingResources(failedPath => { if (failedPath === resourcePath(path)) setMissing(true); }), [path]);
  if (missing) throw new ResourceNotFoundError();
  return children;
}
export default function ResourceRoute({ parameter = 'id', apiRoot, children }: { parameter?: string; apiRoot: string; children: ReactNode }) {
  const params = useParams();
  const id = params[parameter];
  if (!isResourceId(id)) throw new ResourceNotFoundError();
  const path = `${apiRoot}/${id}`;
  return <ResourceRequestBoundary key={path} path={path}>{children}</ResourceRequestBoundary>;
}
export function NotFoundRoute(): never { throw new ResourceNotFoundError(); }
