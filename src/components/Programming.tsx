// frontend/src/components/Programming.tsx
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjects } from '../hooks/useProjects';
import styles from '../styles/components/Programming.module.css';
import { Github, ExternalLink, Code2 } from 'lucide-react';
import ProjectSkeleton from './skeletons/ProjectSkeleton';
import { Project } from '../types';
import { sanitizeHtml } from '../utils/html';
import { buildResponsiveImageProps } from '../utils/imageVariants';
import StarBackground from './StarBackground';

const ProjectCard: FC<{ project: Project }> = ({ project }) => {
  const { t, i18n } = useTranslation();
  const [hasError, setHasError] = useState(false);

  const price = project.price_tag;
  const priceLabel =
    price?.type === 'free'
      ? t('programming.priceFree')
      : price?.type === 'paid'
        ? new Intl.NumberFormat(i18n.language, {
            style: 'currency',
            currency: price.currency,
          }).format(Number(price.amount))
        : null;

  return (
    <article className={styles.projectCard}>
      <div className={styles.imageWrapper}>
        {project.fallback_image?.url ? (
          <img
            {...buildResponsiveImageProps({
              variants: project.variants,
              role: 'thumbnail',
              fallbackSrc: project.fallback_image.url,
              sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
            })}
            alt={project.name}
            className={styles.cardImage}
            loading='lazy'
            decoding='async'
            onError={() => setHasError(true)}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <Code2 size={48} className={styles.placeholderIcon} />
          </div>
        )}
        {project.badge && (
          <span className={`${styles.priceBadge} ${styles.specialBadge}`}>
            {project.badge}
          </span>
        )}
        {priceLabel && (
          <span
            className={`${styles.priceBadge} ${
              price?.type === 'free' ? styles.priceFree : styles.pricePaid
            }`}
          >
            {priceLabel}
          </span>
        )}
        {hasError && (
          <div className={styles.placeholderOverlay}>
            <span className={styles.placeholderText}>[Placeholder]</span>
          </div>
        )}
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{project.name}</h3>
        <div
          className={styles.cardDescription}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(project.description),
          }}
        />

        <div className={styles.techStack}>
          {project.technologies.map((tech: string, index: number) => (
            <span key={index} className={styles.techBadge}>
              {tech}
            </span>
          ))}
        </div>

        <div className={styles.cardActions}>
          {project.github_url && (
            <a
              href={project.github_url}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.actionLink}
            >
              <Github className={styles.icon} /> {t('programming.source')}
            </a>
          )}
          {project.live_url && (
            <a
              href={project.live_url}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.actionLink}
            >
              <ExternalLink className={styles.icon} />{' '}
              {t('programming.liveDemo')}
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

const Programming: FC = () => {
  const { t } = useTranslation();
  const {
    data: projects = [],
    isLoading: loading,
    error: queryError,
  } = useProjects();
  const error = queryError ? t('errors.projects') : null;

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <StarBackground />
      <section className={styles.section}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('programming.title')}</h1>
          <p className={styles.subtitle}>{t('programming.subtitle')}</p>
        </header>

        <div className={styles.grid}>
          {loading ? (
            <ProjectSkeleton count={3} />
          ) : projects.length > 0 ? (
            projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))
          ) : (
            <div className={styles.noResults}>
              <p>{t('programming.empty')}</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Programming;
