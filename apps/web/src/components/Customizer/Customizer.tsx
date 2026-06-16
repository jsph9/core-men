'use client';

import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';

export default function Customizer() {
  // Referencias para manipular el lienzo desde cualquier parte del código
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const logoRef = useRef<Konva.Image | null>(null);

  // Estado para guardar la URL temporal del logo que sube el usuario
  const [logoTemporalUrl, setLogoTemporalUrl] = useState<string | null>(null);

  // 1️⃣ INICIALIZAR EL LIENZO Y EL POLO BASE (Se ejecuta solo 1 vez al cargar)
  useEffect(() => {
    if (!containerRef.current) return;

    // Crear el Stage y Layer
    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 700,
      height: 700,
    });
    stageRef.current = stage;

    const layer = new Konva.Layer();
    stage.add(layer);
    layerRef.current = layer;

    // Crear el Transformer (los bordes para escalar)
    const tr = new Konva.Transformer({
      boundBoxFunc: (oldBox, newBox) => {
        if (newBox.width < 30 || newBox.height < 30) return oldBox;
        return newBox;
      }
    });
    layer.add(tr);
    transformerRef.current = tr;

    // Cargar la prenda base
    const prendaImgObj = new window.Image();
    prendaImgObj.src = '/prenda-base.png';
    prendaImgObj.onload = () => {
      const anchoPantalla = 700; 
      const escala = anchoPantalla / prendaImgObj.width;
      const altoPantalla = prendaImgObj.height * escala;

      stage.width(anchoPantalla);
      stage.height(altoPantalla);

      const bg = new Konva.Image({
        x: 0, y: 0,
        image: prendaImgObj,
        width: anchoPantalla, height: altoPantalla,
        listening: false // Sigue siendo solo fondo inamovible
      });
      
      layer.add(bg);
      bg.moveToBottom(); 
      layer.draw(); 
    };

    // Deseleccionar logo al hacer clic en el fondo de la prenda
    stage.on('click tap', (e) => {
      if (e.target === stage || e.target.index === 0) { // Index 0 suele ser el fondo
        tr.nodes([]);
      }
    });

    return () => {
      stage.destroy();
    };
  }, []); // Array vacío = Solo corre al montar la página


  // 2️⃣ DIBUJAR EL LOGO DEL CLIENTE (Se ejecuta cada vez que sube una imagen)
  useEffect(() => {
    if (!logoTemporalUrl || !layerRef.current || !transformerRef.current) return;

    const layer = layerRef.current;
    const tr = transformerRef.current;

    // Si ya había un logo antes, lo borramos para poner el nuevo
    if (logoRef.current) {
      logoRef.current.destroy();
    }

    const logoImgObj = new window.Image();
    logoImgObj.src = logoTemporalUrl;
    logoImgObj.onload = () => {
      const logo = new Konva.Image({
        x: 250, y: 200, // Aparecerá más o menos al centro
        image: logoImgObj,
        width: 150, height: 150, // Tamaño cuadrado inicial
        draggable: true,
        globalCompositeOperation: 'multiply' // Efecto realista
      });
      
      logoRef.current = logo; 
      layer.add(logo);

      // Seleccionar automáticamente el logo recién subido
      tr.nodes([logo]);

      // Efectos de UX: Quitar realismo al mover, ponerlo al soltar
      logo.on('dragstart transformstart', () => {
        logo.globalCompositeOperation('source-over'); 
        layer.batchDraw();
      });

      logo.on('dragend transformend', () => {
        logo.globalCompositeOperation('multiply'); 
        layer.batchDraw();
      });

      // Seleccionar el logo al hacerle clic
      logo.on('click tap', () => {
        tr.nodes([logo]);
      });

      layer.draw();
    };
  }, [logoTemporalUrl]); // Dependencia: Corre cuando cambia esta variable


  // 3️⃣ FUNCIONES DEL COMPONENTE
  const handleCargarImagen = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (archivo) {
      // Magia: Crear URL temporal en la memoria RAM del navegador
      const urlTemporal = URL.createObjectURL(archivo);
      setLogoTemporalUrl(urlTemporal);
    }
  };

  const guardarEspecificaciones = () => {
    if (logoRef.current && stageRef.current) {
      const node = logoRef.current;
      const stage = stageRef.current;

      const datosParaGuardar = {
        prendaBase: '/prenda-base.png',
        logoTemporalLocal: logoTemporalUrl, // ESTO SE SUBIRÍA A S3 EN EL FUTURO
        posicionX: node.x(),
        posicionY: node.y(),
        ancho: node.width() * node.scaleX(),
        alto: node.height() * node.scaleY(),
        rotacion: node.rotation(),
        canvasWidth: stage.width(),
        canvasHeight: stage.height(),
      };
      
      console.log('📦 JSON Listo para enviar (El logo aún no se sube a internet):', datosParaGuardar);
      alert('Revisa la consola. Las coordenadas y tamaño están listos.');
    } else {
      alert('¡Primero sube un logo para tu prenda!');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gray-50 rounded-xl max-w-4xl mx-auto">
      
      {/* Controles de Subida */}
      <div className="flex flex-col items-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">1. Sube tu diseño</h3>
        <input 
          type="file" 
          accept="image/png, image/jpeg" 
          onChange={handleCargarImagen}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer max-w-xs"
        />
        <p className="text-xs text-gray-400 mt-2">Formatos: PNG (sin fondo) o JPG. No se guarda hasta cotizar.</p>
      </div>

      {/* El Lienzo Konva */}
      <div 
        ref={containerRef} 
        className="border border-gray-200 bg-white rounded-lg shadow-inner overflow-hidden"
      />

      {/* Botón de Guardado */}
      <button
        onClick={guardarEspecificaciones}
        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-md w-full max-w-xs"
      >
        Guardar Cotización
      </button>
    </div>
  );
}