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
  onStageReady,
  onChange,
}: CustomizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const logoRef = useRef<Konva.Image | null>(null);

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

    const layer = new Konva.Layer();
    stage.add(layer);
    layerRef.current = layer;

    const tr = new Konva.Transformer({
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      keepRatio: true,
      boundBoxFunc: (oldBox, newBox) => {
        // Límite mínimo para evitar voltear o achicar demasiado el diseño
        if (newBox.width < 10 || newBox.height < 10) return oldBox;
        return newBox;
      },
    });
    layer.add(tr);
    transformerRef.current = tr;

    // Cargar fondo si existe
    const bgImgObj = new window.Image();
    let bgRect: Konva.Image | null = null;
    if (backgroundUrl) {
      bgImgObj.src = backgroundUrl;
      bgImgObj.onerror = () => {};
      bgImgObj.onload = () => {
        if (!stageRef.current) return;
        bgRect = new Konva.Image({
          x: 0,
          y: 0,
          image: bgImgObj,
          width: designWidth,
          height: designHeight,
          listening: false,
        });
        layer.add(bgRect);
        bgRect.moveToBottom();
        layer.draw();
      };
    }

    // Cargar la prenda base
    const prendaImgObj = new window.Image();
    prendaImgObj.src = baseGarmentUrl || '/prenda-base.png';
    prendaImgObj.onerror = () => {
      // Si la imagen específica falla en cargar, cargamos la prenda base de respaldo por defecto
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
      if (bgRect) {
        bgRect.moveToBottom();
      }
      layer.draw();
    };

    // Cargar el logo del cliente si está disponible
    if (logoUrl) {
      const logoImgObj = new window.Image();
      logoImgObj.src = logoUrl;
      logoImgObj.onerror = () => {
        // Ignorar error de carga si el logo no está en la ubicación indicada
      };
      logoImgObj.onload = () => {
        // Escalar coordenadas relativas al lienzo de previsualización (520x520)
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
          globalCompositeOperation: 'multiply', // Efecto realismo
        });

        logoRef.current = logo;
        layer.add(logo);
        tr.nodes([logo]); // Seleccionado inicialmente

        const notifyChange = () => {
          // Escalar de vuelta a la resolución estándar del canvas (500x500 por defecto)
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

        // Escuchar eventos de interacción
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

    // Deseleccionar logo al hacer clic en el fondo del lienzo
    stage.on('click tap', (e) => {
      if (e.target === stage || e.target.index === 0) {
        tr.nodes([]);
      }
    });

    return () => {
      if (onStageReady) onStageReady(null);
      stage.destroy();
    };
  }, [baseGarmentUrl, logoUrl, canvasWidth, canvasHeight, backgroundUrl]);

  return (
    <div className="w-full flex flex-col items-center bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 self-start pl-1 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
        Visualizador / Posicionador 2D Interactivo
      </span>
      <div 
        ref={containerRef} 
        className="border border-slate-200/80 bg-white rounded-lg shadow-sm overflow-hidden"
      />
      <p className="text-[10px] text-slate-400 mt-2 text-center">
        Arrastra, rota o redimensiona el logo sobre la prenda para actualizar las coordenadas automáticamente.
      </p>
    </div>
  );
}