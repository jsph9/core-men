'use client';

import React, { useEffect, useRef } from 'react';
import Konva from 'konva';

interface CustomizerProps {
  baseGarmentUrl?: string;
  logoUrl?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  rotation?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundUrl?: string;
  zoom?: number;
  mode?: 'select' | 'pan';
  isSimulationActive?: boolean;
  readOnly?: boolean;
  onStageReady?: (stage: Konva.Stage | null) => void;
  onChange?: (updates: {
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    rotation: number;
    canvasWidth: number;
    canvasHeight: number;
  }) => void;
}

// Procesador Gráfico: Genera el mapa de sombras y calcula la luminancia promedio de la tela
const processShadowMask = (img: HTMLImageElement, url: string): { url: string; luminance: number } => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { url: url, luminance: 128 };

  ctx.drawImage(img, 0, 0);
  try {
    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;

    // Calcular luminancia promedio (excluyendo fondo transparente)
    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 30) {
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
        count++;
      }
    }

    const avgR = count > 0 ? totalR / count : 128;
    const avgG = count > 0 ? totalG / count : 128;
    const avgB = count > 0 ? totalB / count : 128;
    const Y = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

    // Generar mapa de sombras y brillos de alto contraste
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 0) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const pixelY = 0.299 * r + 0.587 * g + 0.114 * b;
        const diff = pixelY - Y;

        if (diff < 0) {
          // Pliegues/Sombras oscuras
          const intensity = Math.min(255, Math.abs(diff) * 2.5);
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = Math.round((a / 255) * intensity);
        } else {
          // Brillos/Iluminación
          const intensity = Math.min(255, diff * 3.0);
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = Math.round((a / 255) * intensity);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return { url: canvas.toDataURL(), luminance: Y };
  } catch (err) {
    console.error('Error procesando imagen para sombras:', err);
    return { url: url, luminance: 128 };
  }
};

export default function Customizer({
  baseGarmentUrl,
  logoUrl,
  positionX,
  positionY,
  width,
  height,
  rotation,
  canvasWidth,
  canvasHeight,
  backgroundUrl,
  zoom,
  mode,
  isSimulationActive = true,
  readOnly = false,
  onStageReady,
  onChange,
}: CustomizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const getProxiedUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const logoRef = useRef<Konva.Image | null>(null);
  const logoGroupRef = useRef<Konva.Group | null>(null);
  const shadowMaskCacheRef = useRef<{ [key: string]: { url: string; luminance: number } }>({});
  const logoImgObjRef = useRef<HTMLImageElement | null>(null);
  const shadowOverlayObjRef = useRef<HTMLImageElement | null>(null);
  const logoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedMaskRef = useRef<any>(null);

  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentTranslateRef = useRef({ x: 0, y: 0 });

  const garmentRectRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  const garmentLuminanceRef = useRef<number>(128);
  const isSimulationActiveRef = useRef<boolean>(isSimulationActive);
  const isLogoInteractingRef = useRef<boolean>(false);

  // Sincronizar el ref con la prop
  useEffect(() => {
    isSimulationActiveRef.current = isSimulationActive;
  }, [isSimulationActive]);

  // Inicializar canvas local en navegador
  if (typeof window !== 'undefined' && !logoCanvasRef.current) {
    logoCanvasRef.current = document.createElement('canvas');
  }

  // Redibujar el logo sobre el canvas local aplicando la máscara de sombras
  const redrawLogoCanvas = () => {
    const canvas = logoCanvasRef.current;
    if (!canvas) return;

    const logoImg = logoImgObjRef.current;
    if (!logoImg) return;

    const logoNode = logoRef.current;
    if (!logoNode) return;

    const logoWidth = logoNode.width();
    const logoHeight = logoNode.height();
    const logoScaleX = logoNode.scaleX();
    const logoScaleY = logoNode.scaleY();
    const logoRotation = logoNode.rotation();
    const logoX = logoNode.x();
    const logoY = logoNode.y();

    // Dimensiones en pantalla
    const renderWidth = Math.ceil(logoWidth * Math.abs(logoScaleX));
    const renderHeight = Math.ceil(logoHeight * Math.abs(logoScaleY));

    if (renderWidth <= 0 || renderHeight <= 0) return;

    // Multiplicador de calidad para evitar pixelación (4x resolución de pantalla para soporte Retina/Zoom)
    const qualityScale = 4;
    const canvasWidth = renderWidth * qualityScale;
    const canvasHeight = renderHeight * qualityScale;

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Escalar el contexto al multiplicador de calidad para todo el renderizado interno
    ctx.save();
    ctx.scale(qualityScale, qualityScale);

    // 1. Dibujar el logo con suavizado de alta calidad
    ctx.save();
    if (logoScaleX < 0 || logoScaleY < 0) {
      ctx.translate(logoScaleX < 0 ? renderWidth : 0, logoScaleY < 0 ? renderHeight : 0);
      ctx.scale(logoScaleX < 0 ? -1 : 1, logoScaleY < 0 ? -1 : 1);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(logoImg, 0, 0, renderWidth, renderHeight);
    ctx.restore();

    // 2. Aplicar el mapa de sombras de la prenda usando source-atop (solo si no se está interactuando)
    if (isSimulationActiveRef.current && shadowOverlayObjRef.current && !isLogoInteractingRef.current) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';

      // Blending e intensidad según luminancia
      const Y = garmentLuminanceRef.current;
      if (Y > 170) {
        ctx.globalAlpha = 0.8;
      } else if (Y > 80) {
        ctx.globalAlpha = 0.5;
      } else {
        ctx.globalAlpha = 0.65;
      }

      // Obtener matriz inversa del transform del logo para mapear coordenadas globales -> locales
      const transform = new Konva.Transform(logoNode.getTransform().getMatrix().slice());
      transform.invert();
      const inv = transform.getMatrix();

      // Aplicar transformaciones al contexto del canvas local
      ctx.scale(Math.abs(logoScaleX), Math.abs(logoScaleY));
      ctx.transform(inv[0], inv[1], inv[2], inv[3], inv[4], inv[5]);

      // Dibujar la máscara completa en su posición global
      const gRect = garmentRectRef.current;
      ctx.drawImage(shadowOverlayObjRef.current, gRect.x, gRect.y, gRect.width, gRect.height);
      ctx.restore();
    }

    ctx.restore();
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Definimos un tamaño de visualización estándar para el paso 3 del asistente
    const designWidth = 520;
    const designHeight = 520;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: designWidth,
      height: designHeight,
    });
    stageRef.current = stage;
    if (onStageReady) onStageReady(stage);

    // Aplicar escala y centrado iniciales de zoom si se provee
    const initialZoom = zoom || 1;
    stage.scale({ x: initialZoom, y: initialZoom });
    stage.position({
      x: (designWidth * (1 - initialZoom)) / 2,
      y: (designHeight * (1 - initialZoom)) / 2,
    });

    const layer = new Konva.Layer();
    stage.add(layer);
    layerRef.current = layer;

    // Crear grupos para mantener el orden de apilamiento de manera estricta
    const bgGroup = new Konva.Group();
    const logoGroup = new Konva.Group({
      x: 0,
      y: 0,
      width: designWidth,
      height: designHeight,
      globalCompositeOperation: 'source-atop', // Nivel 2: Recorte por GPU sobre la prenda base
    });
    logoGroupRef.current = logoGroup;

    layer.add(bgGroup);
    layer.add(logoGroup);

    const tr = new Konva.Transformer({
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      keepRatio: true,
      boundBoxFunc: (oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) return oldBox;
        return newBox;
      },
    });
    if (readOnly) {
      tr.visible(false);
    }
    layer.add(tr);
    transformerRef.current = tr;

    // Cargar la prenda base (el fondo del canvas queda transparente)
    const prendaImgObj = new window.Image();
    prendaImgObj.crossOrigin = 'anonymous';
    prendaImgObj.src = getProxiedUrl(baseGarmentUrl) || '/prenda-base.png';
    prendaImgObj.onerror = () => {
      if (prendaImgObj.crossOrigin === 'anonymous') {
        prendaImgObj.removeAttribute('crossorigin');
        prendaImgObj.src = getProxiedUrl(baseGarmentUrl) || '/prenda-base.png';
      } else if (prendaImgObj.src !== window.location.origin + '/prenda-base.png') {
        prendaImgObj.src = '/prenda-base.png';
      }
    };

    prendaImgObj.onload = () => {
      if (!stageRef.current) return;

      const imgWidth = prendaImgObj.width;
      const imgHeight = prendaImgObj.height;
      const ratio = Math.min(designWidth / imgWidth, designHeight / imgHeight);

      const newWidth = imgWidth * ratio;
      const newHeight = imgHeight * ratio;
      const x = (designWidth - newWidth) / 2;
      const y = (designHeight - newHeight) / 2;

      // Guardar dimensiones globales de la prenda
      garmentRectRef.current = { x, y, width: newWidth, height: newHeight };

      const bg = new Konva.Image({
        x: x,
        y: y,
        image: prendaImgObj,
        width: newWidth,
        height: newHeight,
        listening: false, // Estático
      });
      bgGroup.add(bg);

      // Procesar y cachear el mapa de sombras solo si se cargó con CORS permitido
      let cachedMask = shadowMaskCacheRef.current[baseGarmentUrl || ''];
      if (!cachedMask && baseGarmentUrl && prendaImgObj.crossOrigin === 'anonymous') {
        cachedMask = processShadowMask(prendaImgObj, baseGarmentUrl);
        shadowMaskCacheRef.current[baseGarmentUrl] = cachedMask;
      }

      if (cachedMask) {
        garmentLuminanceRef.current = cachedMask.luminance;

        const shadowOverlayObj = new window.Image();
        shadowOverlayObj.crossOrigin = 'anonymous';
        shadowOverlayObj.src = cachedMask.url;
        shadowOverlayObj.onerror = () => {
          if (shadowOverlayObj.crossOrigin === 'anonymous') {
            shadowOverlayObj.removeAttribute('crossorigin');
            shadowOverlayObj.src = cachedMask.url;
          }
        };
        shadowOverlayObj.onload = () => {
          shadowOverlayObjRef.current = shadowOverlayObj;
          redrawLogoCanvas();
          if (logoRef.current && logoCanvasRef.current) {
            logoRef.current.image(logoCanvasRef.current);
          }
          tr.moveToTop();
          layer.draw();
        };
      } else {
        shadowOverlayObjRef.current = null;
        redrawLogoCanvas();
        if (logoRef.current && logoCanvasRef.current) {
          logoRef.current.image(logoCanvasRef.current);
        }
        tr.moveToTop();
        layer.draw();
      }

      layer.draw();
    };

    // Cargar el logo del cliente si está disponible
    if (logoUrl) {
      const logoImgObj = new window.Image();
      logoImgObj.crossOrigin = 'anonymous';
      logoImgObj.src = getProxiedUrl(logoUrl);
      logoImgObj.onerror = () => {
        if (logoImgObj.crossOrigin === 'anonymous') {
          logoImgObj.removeAttribute('crossorigin');
          logoImgObj.src = getProxiedUrl(logoUrl);
        }
      };
      logoImgObj.onload = () => {
        const scaleXRatio = designWidth / (canvasWidth || 500);
        const scaleYRatio = designHeight / (canvasHeight || 500);

        let initialWidth = width;
        let initialHeight = height;

        // Autocalcular usando la proporción de la imagen solo si no se enviaron dimensiones válidas
        if (!initialWidth || !initialHeight || initialWidth <= 0 || initialHeight <= 0) {
          const logoRatio = logoImgObj.width / logoImgObj.height;
          if (logoRatio > 1) {
            initialWidth = 120;
            initialHeight = 120 / logoRatio;
          } else {
            initialHeight = 120;
            initialWidth = 120 * logoRatio;
          }
          
          if (onChange) {
            onChange({
              positionX: positionX !== undefined ? positionX : 150,
              positionY: positionY !== undefined ? positionY : 150,
              width: Math.round(initialWidth),
              height: Math.round(initialHeight),
              rotation: rotation || 0,
              canvasWidth: canvasWidth || 500,
              canvasHeight: canvasHeight || 500,
            });
          }
        }

        logoImgObjRef.current = logoImgObj;

        // Inicializar resolución inicial del canvas local
        const canvas = logoCanvasRef.current;
        if (canvas) {
          canvas.width = Math.ceil(initialWidth * scaleXRatio);
          canvas.height = Math.ceil(initialHeight * scaleYRatio);
        }

        const logo = new Konva.Image({
          x: positionX !== undefined ? positionX * scaleXRatio : (designWidth - (initialWidth * scaleXRatio)) / 2,
          y: positionY !== undefined ? positionY * scaleYRatio : (designHeight - (initialHeight * scaleYRatio)) / 2,
          image: logoCanvasRef.current || undefined,
          width: initialWidth * scaleXRatio,
          height: initialHeight * scaleYRatio,
          rotation: rotation || 0,
          draggable: !readOnly,
        });

        logoRef.current = logo;
        logoGroup.add(logo);
        if (!readOnly) {
          tr.nodes([logo]);
        }

        // Dibujar el canvas por primera vez con el logo
        redrawLogoCanvas();
        if (logoCanvasRef.current) {
          logo.image(logoCanvasRef.current);
        }

        const notifyChange = () => {
          const invScaleX = (canvasWidth || 500) / designWidth;
          const invScaleY = (canvasHeight || 500) / designHeight;

          if (onChange) {
            onChange({
              positionX: Math.round(logo.x() * invScaleX),
              positionY: Math.round(logo.y() * invScaleY),
              width: Math.round(logo.width() * logo.scaleX() * invScaleX),
              height: Math.round(logo.height() * logo.scaleY() * invScaleY),
              rotation: Math.round(logo.rotation()),
              canvasWidth: canvasWidth || 500,
              canvasHeight: canvasHeight || 500,
            });
          }
        };

        if (!readOnly) {
          // Escuchar eventos de arrastre y redimensionamiento para actualizar la máscara en tiempo real
          logo.on('dragstart transformstart', () => {
            isLogoInteractingRef.current = true;
            redrawLogoCanvas();
            if (logoCanvasRef.current) {
              logo.image(logoCanvasRef.current);
            }
            layer.batchDraw();
          });

          logo.on('dragmove transform', () => {
            redrawLogoCanvas();
            if (logoCanvasRef.current) {
              logo.image(logoCanvasRef.current);
            }
            layer.batchDraw();
          });

          logo.on('dragend transformend', () => {
            isLogoInteractingRef.current = false;
            redrawLogoCanvas();
            if (logoCanvasRef.current) {
              logo.image(logoCanvasRef.current);
            }
            layer.batchDraw();
            notifyChange();
          });
        }

        logo.on('click tap', () => {
          if (!readOnly) {
            tr.nodes([logo]);
          }
        });

        layer.draw();
      };
    }

    stage.on('click tap', (e) => {
      if (e.target === stage) {
        tr.nodes([]);
      }
    });

    return () => {
      if (onStageReady) onStageReady(null);
      stage.destroy();
    };
  }, [baseGarmentUrl, logoUrl, canvasWidth, canvasHeight]);

  // Alternar la visibilidad de la capa de simulación de sombras en tiempo real
  useEffect(() => {
    redrawLogoCanvas();
    if (logoRef.current && logoCanvasRef.current) {
      logoRef.current.image(logoCanvasRef.current);
    }
    if (layerRef.current) {
      layerRef.current.batchDraw();
    }
  }, [isSimulationActive]);

  // Manejar el cambio dinámico del nivel de zoom del canvas sin reconstruir el stage
  useEffect(() => {
    if (!stageRef.current) return;
    const stage = stageRef.current;
    const z = zoom || 1;
    stage.scale({ x: z, y: z });
    const designWidth = 520;
    const designHeight = 520;
    stage.position({
      x: (designWidth * (1 - z)) / 2,
      y: (designHeight * (1 - z)) / 2,
    });
    stage.batchDraw();
  }, [zoom]);

  // Restablecer la traslación de la prenda al cambiar de vista o de nivel de zoom
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.style.transform = 'translate(0px, 0px)';
      currentTranslateRef.current = { x: 0, y: 0 };
    }
  }, [zoom, baseGarmentUrl]);

  // Actualizar la posición, tamaño y rotación del logo de forma reactiva cuando cambien las props del padre
  useEffect(() => {
    const logo = logoRef.current;
    if (!logo || !stageRef.current || !layerRef.current) return;

    // Calcular la relación de escala de coordenadas (Pantalla vs. Base de datos)
    const scaleXRatio = stageRef.current.width() / (canvasWidth || 500);
    const scaleYRatio = stageRef.current.height() / (canvasHeight || 500);

    // Aplicar los nuevos valores al nodo de Konva
    if (positionX !== undefined) logo.x(positionX * scaleXRatio);
    if (positionY !== undefined) logo.y(positionY * scaleYRatio);
    if (width !== undefined) logo.width(width * scaleXRatio);
    if (height !== undefined) logo.height(height * scaleYRatio);
    if (rotation !== undefined) logo.rotation(rotation);

    // Forzar actualización del transformador visual si está seleccionado
    const tr = transformerRef.current;
    if (tr && tr.nodes().length > 0) {
      tr.forceUpdate();
    }

    // Redibujar el canvas local con los nuevos tamaños y sombras aplicadas
    redrawLogoCanvas();
    if (logoCanvasRef.current) {
      logo.image(logoCanvasRef.current);
    }
    
    layerRef.current.batchDraw();
  }, [positionX, positionY, width, height, rotation, canvasWidth, canvasHeight]);

  // Manejar el cambio de modo (selección vs mano)
  useEffect(() => {
    if (!stageRef.current || !layerRef.current || !transformerRef.current) return;
    const stage = stageRef.current;
    const tr = transformerRef.current;
    const isPan = mode === 'pan';

    // Desactivar el arrastre de Konva (usaremos arrastre DOM del canvas completo)
    stage.draggable(false);
    stage.container().style.cursor = isPan ? 'grab' : 'default';

    if (isPan) {
      tr.nodes([]); // Deseleccionar
    } else {
      if (logoRef.current) {
        tr.nodes([logoRef.current]); // Re-seleccionar el logo si existe
      }
    }

    if (logoRef.current) {
      logoRef.current.draggable(!isPan && !readOnly);
    }
    layerRef.current.draw();
  }, [mode]);

  // Controlador de arrastre del elemento HTML del Canvas completo (Mano / Pan)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (mode !== 'pan') return;
      isDraggingRef.current = true;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || mode !== 'pan') return;
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      
      const newX = currentTranslateRef.current.x + dx;
      const newY = currentTranslateRef.current.y + dy;

      el.style.transform = `translate(${newX}px, ${newY}px)`;
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current || mode !== 'pan') return;
      isDraggingRef.current = false;
      el.style.cursor = 'grab';
      
      const style = window.getComputedStyle(el);
      const matrix = new WebKitCSSMatrix(style.transform);
      currentTranslateRef.current = { x: matrix.m41, y: matrix.m42 };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (mode !== 'pan' || e.touches.length === 0) return;
      isDraggingRef.current = true;
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || mode !== 'pan' || e.touches.length === 0) return;
      const dx = e.touches[0].clientX - startPosRef.current.x;
      const dy = e.touches[0].clientY - startPosRef.current.y;
      
      const newX = currentTranslateRef.current.x + dx;
      const newY = currentTranslateRef.current.y + dy;

      el.style.transform = `translate(${newX}px, ${newY}px)`;
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current || mode !== 'pan') return;
      isDraggingRef.current = false;
      const style = window.getComputedStyle(el);
      const matrix = new WebKitCSSMatrix(style.transform);
      currentTranslateRef.current = { x: matrix.m41, y: matrix.m42 };
    };

    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    el.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      el.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mode]);

  return (
    <div 
      ref={containerRef} 
      className="relative overflow-visible pointer-events-auto transition-transform duration-75 ease-out"
    />
  );
}