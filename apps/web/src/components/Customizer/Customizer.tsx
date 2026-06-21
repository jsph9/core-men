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
    const designWidth = 450;
    const designHeight = 450;

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
      const bg = new Konva.Image({
        x: 0,
        y: 0,
        image: prendaImgObj,
        width: designWidth,
        height: designHeight,
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
        // Escalar coordenadas relativas al lienzo de previsualización (450x450)
        const scaleXRatio = designWidth / (canvasWidth || 500);
        const scaleYRatio = designHeight / (canvasHeight || 500);

        const logo = new Konva.Image({
          x: positionX !== undefined ? positionX * scaleXRatio : 150,
          y: positionY !== undefined ? positionY * scaleYRatio : 150,
          image: logoImgObj,
          width: width !== undefined ? width * scaleXRatio : 100,
          height: height !== undefined ? height * scaleYRatio : 100,
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
    <div className="flex flex-col items-center bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm">
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