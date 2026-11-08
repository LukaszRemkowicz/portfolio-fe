import type { Route } from './+types/privacy';
import MainLayout from '../components/MainLayout';
import PrivacyPolicy from '../components/PrivacyPolicy';
import { createLoaderRequestContext } from '../utils/loaderData';
import { routeMeta } from '../seo/buildMeta';

export async function loader({ request, context }: Route.LoaderArgs) {
  const { t } = await createLoaderRequestContext(request, context.requestId);
  return {
    seo: {
      title: t('privacy.title'),
      description: t('privacy.introduction.body'),
    },
  };
}

export function meta({ data, matches, location }: Route.MetaArgs) {
  return routeMeta(data?.seo, matches[0].loaderData, location);
}

export default function Privacy() {
  return (
    <MainLayout>
      <PrivacyPolicy />
    </MainLayout>
  );
}
