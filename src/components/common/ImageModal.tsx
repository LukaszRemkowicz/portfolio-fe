// frontend/src/components/common/ImageModal.tsx
import {
  type FC,
  useEffect,
  useCallback,
  useState,
  useRef,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { X, Calendar, MapPin } from 'lucide-react';
import styles from '../../styles/components/ImageModal.module.css';
import { AstroImage, EquipmentItem } from '../../types';
import { useAstroImageDetail } from '../../hooks/useAstroImageDetail';
import { useImageUrls } from '../../hooks/useImageUrls';
import { sanitizeHtml, isHtmlEmpty, slugify } from '../../utils/html';
import { APP_ROUTES } from '../../api/constants';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import ImageWithFallback from './ImageWithFallback';

interface ImageModalProps {
  image: AstroImage | null;
  onClose: () => void;
}

// Hydration-safe "is the browser" flag: false on the server and during hydration
// (the portal below must not be part of the hydrated tree), true afterwards.
const subscribeNoop = () => () => undefined;

const ImageModalContent: FC<ImageModalProps> = ({ image, onClose }) => {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const { data: activeImageDetail, isLoading: isActiveImageLoading } =
    useAstroImageDetail(image?.slug || null);
  const { data: imageUrls = {} } = useImageUrls(
    image ? image.pk.toString() : null,
    !!image
  );
  const thumbnailImageSrc =
    image?.fallback_image?.url || activeImageDetail?.fallback_image?.url || '';
  const preferredImageSrc =
    (image ? imageUrls[image.pk] : undefined) ||
    activeImageDetail?.url ||
    image?.url ||
    '';
  const imageSourceKey = [
    image?.slug || '',
    thumbnailImageSrc,
    preferredImageSrc,
  ].join('|');
  const initialImageSrc = thumbnailImageSrc || preferredImageSrc;

  const [isFullRes, setIsFullRes] = useState(false);
  const [resolvedImageState, setResolvedImageState] = useState(() => ({
    key: imageSourceKey,
    src: initialImageSrc,
  }));
  const [fullImageLoadFailedState, setFullImageLoadFailedState] = useState(
    () => ({
      key: imageSourceKey,
      value: false,
    })
  );
  const suppressClickUntilRef = useRef(0);
  const resolvedImageSrc =
    resolvedImageState.key === imageSourceKey
      ? resolvedImageState.src
      : initialImageSrc;
  const fullImageLoadFailed =
    fullImageLoadFailedState.key === imageSourceKey
      ? fullImageLoadFailedState.value
      : false;

  const closeFullRes = () => setIsFullRes(false);

  // A pan/pinch/zoom gesture ends with a synthetic click; ignore it for a moment.
  const suppressNextClick = () => {
    suppressClickUntilRef.current = Date.now() + 300;
  };

  useEffect(() => {
    if (!preferredImageSrc || preferredImageSrc === resolvedImageSrc) {
      return;
    }

    let cancelled = false;
    const probe = new Image();

    probe.onload = () => {
      if (!cancelled) {
        setFullImageLoadFailedState({
          key: imageSourceKey,
          value: false,
        });
        setResolvedImageState({
          key: imageSourceKey,
          src: preferredImageSrc,
        });
      }
    };

    probe.onerror = () => {
      if (!cancelled) {
        setFullImageLoadFailedState({
          key: imageSourceKey,
          value: true,
        });
      }
    };

    probe.src = preferredImageSrc;

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [imageSourceKey, preferredImageSrc, resolvedImageSrc]);

  // Lock page scroll/rubber-banding behind the modal; restore on close.
  useEffect(() => {
    if (!image) return;
    const targets = [document.documentElement, document.body];
    const prev = targets.map(el => [
      el.style.overflow,
      el.style.overscrollBehavior,
    ]);
    targets.forEach(el => {
      el.style.overflow = 'hidden';
      el.style.overscrollBehavior = 'none';
    });
    return () =>
      targets.forEach((el, i) => {
        [el.style.overflow, el.style.overscrollBehavior] = prev[i];
      });
  }, [image]);

  useEffect(() => {
    if (!image) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (isFullRes) {
          closeFullRes();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, onClose, isFullRes]);

  const handleTagClick = useCallback(
    (tag: string) => {
      // We don't call onClose() here because navigate() will change the URL,
      // and the parent component's useEffect will close the modal since the 'img' param will be gone.
      // This allows the browser's back button to return to the modal!
      const tagSlug = slugify(tag);
      navigate(
        `${APP_ROUTES.ASTROPHOTOGRAPHY}?tag=${encodeURIComponent(tagSlug)}`
      );
    },
    [navigate]
  );

  const renderEquipment = () => {
    // Prefer the fully detailed image if available, otherwise fall back to the basic prop
    // However, basic prop (from list) likely doesn't have equipment/specs anymore due to backend optimization.
    const source = activeImageDetail || image;
    if (!source) return null;

    if (isActiveImageLoading) {
      return (
        <div className={styles.specsLoading}>
          <div className={styles.specsSkeleton} />
          <div className={styles.specsSkeleton} />
          <div className={styles.specsSkeleton} />
        </div>
      );
    }

    const getEquipmentValue = (
      items: (EquipmentItem | string)[] | undefined,
      key: 'model' | 'name'
    ) => {
      if (!Array.isArray(items) || items.length === 0) return null;
      return items.map(t => (typeof t === 'string' ? t : t[key])).join(', ');
    };

    const telescopeValue = getEquipmentValue(
      source.telescope as (EquipmentItem | string)[],
      'model'
    );
    const lensValue = !telescopeValue
      ? getEquipmentValue(source.lens as (EquipmentItem | string)[], 'model')
      : null;
    const cameraValue = getEquipmentValue(
      source.camera as (EquipmentItem | string)[],
      'model'
    );
    const trackerValue = getEquipmentValue(
      source.tracker as (EquipmentItem | string)[],
      'name'
    );
    const tripodValue = getEquipmentValue(
      source.tripod as (EquipmentItem | string)[],
      'name'
    );

    const items = [
      {
        label:
          Array.isArray(source.telescope) && source.telescope.length > 1
            ? 'Telescopes'
            : 'Telescope',
        value: telescopeValue,
      },
      {
        label:
          Array.isArray(source.lens) && source.lens.length > 1
            ? 'Lenses'
            : 'Lens',
        value: lensValue,
      },
      {
        label:
          Array.isArray(source.camera) && source.camera.length > 1
            ? 'Cameras'
            : 'Camera',
        value: cameraValue,
      },
      {
        label:
          Array.isArray(source.tracker) && source.tracker.length > 1
            ? 'Trackers'
            : 'Tracker',
        value: trackerValue,
      },
      {
        label:
          Array.isArray(source.tripod) && source.tripod.length > 1
            ? 'Tripods'
            : 'Tripod',
        value: tripodValue,
      },
      {
        label: 'Exposure',
        value: !isHtmlEmpty(source.exposure_details) ? (
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(source.exposure_details!),
            }}
          />
        ) : null,
      },
      {
        label: 'Processing',
        value: !isHtmlEmpty(source.processing_details) ? (
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(source.processing_details!),
            }}
          />
        ) : null,
      },
    ].filter(item => item.value);

    if (items.length === 0) return null;

    return (
      <div className={styles.specsBar}>
        {items.map(item => (
          <div
            key={item.label}
            className={`${styles.specItem} ${
              item.label === 'Exposure' ? styles.fullWidth : ''
            }`}
          >
            <span className={styles.specLabel}>{item.label}</span>
            <span className={styles.specValue}>{item.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!image) return null;

  // Prevent SSR crash: document.body is not available during server rendering.
  if (typeof window === 'undefined' || !isClient) return null;

  return createPortal(
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      data-testid='image-modal'
    >
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button
          className={styles.modalClose}
          onClick={onClose}
          aria-label='Close modal'
        >
          <X size={24} />
        </button>

        <div className={styles.imageWrapper}>
          <ImageWithFallback
            src={resolvedImageSrc}
            fallbackOnEmptySrc={false}
            alt={image.name}
            className={styles.modalImage}
            onClick={() => {
              if (image.process !== false) {
                setIsFullRes(true);
              }
            }}
            style={{ cursor: image.process !== false ? 'zoom-in' : 'default' }}
            title={
              image.process !== false
                ? 'Click to view full resolution'
                : undefined
            }
            draggable='false'
            onContextMenu={e => e.preventDefault()}
          />
          {fullImageLoadFailed && (
            <p className={styles.imageStatusMessage} role='status'>
              Could not load full image. Showing thumbnail instead.
            </p>
          )}
        </div>

        {isFullRes &&
          createPortal(
            <div
              className={styles.fullResOverlay}
              onClick={e => {
                if (
                  (e.target as HTMLElement).tagName === 'IMG' ||
                  Date.now() < suppressClickUntilRef.current
                ) {
                  return;
                }
                closeFullRes();
              }}
            >
              <button
                className={styles.fullResClose}
                onClick={e => {
                  e.stopPropagation();
                  closeFullRes();
                }}
              >
                <X size={32} />
              </button>
              <TransformWrapper
                minScale={1}
                maxScale={4}
                initialScale={1}
                centerOnInit
                limitToBounds
                doubleClick={{ mode: 'toggle', step: 1.5 }}
                wheel={{ step: 0.2 }}
                pinch={{ disabled: false }}
                panning={{ disabled: false, velocityDisabled: true }}
                velocityAnimation={{ disabled: true }}
                onPanningStart={suppressNextClick}
                onPanningStop={suppressNextClick}
                onPinchStart={suppressNextClick}
                onPinchStop={suppressNextClick}
                onZoomStop={suppressNextClick}
              >
                <TransformComponent
                  wrapperClass={styles.fullResWrapper}
                  contentClass={styles.fullResContent}
                >
                  <ImageWithFallback
                    src={resolvedImageSrc}
                    fallbackOnEmptySrc={false}
                    alt={image.name}
                    className={styles.fullResImage}
                    draggable='false'
                    onContextMenu={e => e.preventDefault()}
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>,
            document.body
          )}

        <div className={styles.modalMetadata}>
          <div className={styles.metadataLeft}>
            <h2 className={styles.modalTitle}>{image.name}</h2>
            <div className={styles.metaRow}>
              {image.capture_date && (
                <span className={styles.metaItem}>
                  <Calendar size={14} className={styles.metaIcon} />
                  {new Date(image.capture_date).toLocaleDateString(
                    i18n.language,
                    {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }
                  )}
                </span>
              )}
              {image.place && (
                <span className={styles.metaItem}>
                  <MapPin size={14} className={styles.metaIcon} />
                  {image.place.name || image.place.country}
                  {image.place.name && image.place.country
                    ? `, ${image.place.country}`
                    : ''}
                </span>
              )}
            </div>
          </div>
          <div className={styles.tagsContainer}>
            {image.tags?.map(tag => (
              <button
                key={tag.slug}
                className={styles.tagBadge}
                onClick={() => handleTagClick(tag.slug)}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.descriptionWrapper}>
          {renderEquipment()}
          {/* Use activeImageDetail for description, as list item no longer has it */}
          {(activeImageDetail?.description || image.description) && (
            <div className={styles.descriptionContent}>
              <div
                className={styles.modalDescription}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(
                    activeImageDetail?.description || image.description || ''
                  ),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const ImageModal: FC<ImageModalProps> = ({ image, onClose }) => {
  return (
    <ImageModalContent
      key={image?.pk ? image.pk.toString() : 'image-modal-empty'}
      image={image}
      onClose={onClose}
    />
  );
};

export default ImageModal;
