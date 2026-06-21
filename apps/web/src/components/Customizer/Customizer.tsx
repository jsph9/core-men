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
  onStageReady,
  onChange,
}: CustomizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const logoRef = useRef<Konva.Image | null>(null);

  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentTranslateRef = useRef({ x: 0, y: 0 });

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

    const tr = new Konva.Transformer({
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      keepRatio: true,
      boundBoxFunc: (oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) return oldBox;
        return newBox;
      },
    });
    layer.add(tr);
    transformerRef.current = tr;

    // Cargar la prenda base (el fondo del canvas queda transparente)
    const prendaImgObj = new window.Image();
    prendaImgObj.src = baseGarmentUrl || '/prenda-base.png';
    prendaImgObj.onerror = () => {
      if (prendaImgObj.src !== window.location.origin + '/prenda-base.png') {
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

      const bg = new Konva.Image({
        x: x,
        y: y,
        image: prendaImgObj,
        width: newWidth,
        height: newHeight,
        listening: false, // Estático
      });
      layer.add(bg);
      layer.draw();
    };

    // Cargar el logo del cliente si está disponible
    if (logoUrl) {
      const logoImgObj = new window.Image();
      logoImgObj.src = logoUrl;
      logoImgObj.onerror = () => {};
      logoImgObj.onload = () => {
        const scaleXRatio = designWidth / (canvasWidth || 500);
        const scaleYRatio = designHeight / (canvasHeight || 500);

        let initialWidth = width;
        let initialHeight = height;

        const logoRatio = logoImgObj.width / logoImgObj.height;
        const currentRatio = (initialWidth && initialHeight) ? (initialWidth / initialHeight) : 1;
        const ratioDiff = Math.abs(currentRatio - logoRatio);

        if (
          initialWidth === undefined || 
          initialHeight === undefined || 
          initialWidth <= 0 || 
          initialHeight <= 0 || 
          ratioDiff > 0.05
        ) {
          if (logoRatio > 1) {
            initialWidth = width && width > 0 ? width : 120;
            initialHeight = initialWidth / logoRatio;
          } else {
            initialHeight = height && height > 0 ? height : 120;
            initialWidth = initialHeight * logoRatio;
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

        const logo = new Konva.Image({
          x: positionX !== undefined ? positionX * scaleXRatio : (designWidth - (initialWidth * scaleXRatio)) / 2,
          y: positionY !== undefined ? positionY * scaleYRatio : (designHeight - (initialHeight * scaleYRatio)) / 2,
          image: logoImgObj,
          width: initialWidth * scaleXRatio,
          height: initialHeight * scaleYRatio,
          rotation: rotation || 0,
          draggable: true,
          globalCompositeOperation: 'multiply',
        });

        logoRef.current = logo;
        layer.add(logo);
        tr.nodes([logo]);

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

        logo.on('dragstart transformstart', () => {
          logo.globalCompositeOperation('source-over');
          layer.batchDraw();
        });

        logo.on('dragend transformend', () => {
          logo.globalCompositeOperation('multiply');
          layer.batchDraw();
          notifyChange();
        });

        logo.on('click tap', () => {
          tr.nodes([logo]);
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
      logoRef.current.draggable(!isPan);
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