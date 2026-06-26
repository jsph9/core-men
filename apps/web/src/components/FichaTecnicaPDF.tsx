import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 25, 
    borderBottomWidth: 2, 
    borderBottomColor: '#0f172a', 
    paddingBottom: 12 
  },
  headerLeft: { flex: 1 },
  headerRight: { width: 180, textAlign: 'right', alignItems: 'flex-end' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  companyName: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  orderNumberLabel: { fontSize: 9, textTransform: 'uppercase', color: '#64748b' },
  orderNumber: { fontSize: 14, fontWeight: 'bold', color: '#dc2626', marginTop: 2 }, 
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: 6, marginBottom: 8, color: '#1e293b', textTransform: 'uppercase' },
  row: { flexDirection: 'row', marginBottom: 5, alignItems: 'center' },
  label: { width: 110, fontWeight: 'bold', color: '#475569' },
  value: { flex: 1, color: '#0f172a' },
  table: { width: '100%', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10, borderRadius: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', fontWeight: 'bold', alignItems: 'stretch' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'stretch' },
  tableCol: { padding: 10, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  col1: { width: '30%' }, 
  col2: { width: '35%' }, 
  col3: { width: '23%' }, 
  col4: { width: '12%', borderRightWidth: 0 },
  image: { width: 85, height: 85, objectFit: 'contain', marginTop: 6, borderRadius: 4, borderWidth: 1, borderColor: '#f1f5f9' },
  techText: { marginBottom: 4, color: '#334155' },
  boldTech: { fontWeight: 'bold', color: '#0f172a' },

  // Estilos agregados para la cuadrícula de la página 2 (Anexo)
  gridSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 5,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  gridImage: {
    width: '100%',
    height: 180,
    objectFit: 'contain',
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 8,
    textTransform: 'uppercase',
  }
});

export const FichaTecnicaPDF = ({ 
  quote, 
  baseProduct, 
  uniqueColors, 
  uniqueSizes, 
  getQuantity, 
  getColorTotal,
  allImages // <-- Nueva propiedad que agregamos en el paso anterior
}: { 
  quote: any;
  baseProduct: any;
  uniqueColors: any[];
  uniqueSizes: any[];
  getQuantity: (colorId: string, sizeId: string) => any;
  getColorTotal: (colorId: string) => any;
  allImages?: any[];
}) => {

  // Procesamos dinámicamente el arreglo de las 4 vistas para la segunda hoja
  const vistasPrenda = [
    { label: 'Vista Frontal', url: allImages?.[0]?.url },
    { label: 'Vista Espalda', url: allImages?.[1]?.url },
    { label: 'Manga Izquierda', url: allImages?.[2]?.url },
    { label: 'Manga Derecha', url: allImages?.[3]?.url },
  ].filter(vista => vista.url);

  return (
    <Document>
      {/* 📄 HOJA 1: DATOS GENERALES, MATRIZ Y OBSERVACIONES */}
      <Page size="A4" style={styles.page}>
        
        {/* 1. Encabezado */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>FICHA TÉCNICA DE PRODUCCIÓN</Text>
            <Text style={styles.companyName}>CoreMen</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.orderNumberLabel}>Código de Pedido</Text>
            <Text style={styles.orderNumber}>{quote?.code || quote?.id?.substring(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        {/* 2. Datos Generales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos Generales de la Orden</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente:</Text>
            <Text style={styles.value}>{quote?.client?.firstName} {quote?.client?.lastName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de Emisión:</Text>
            <Text style={styles.value}>
            {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Estado en Taller:</Text>
            <Text style={styles.value}>En Producción</Text>
          </View>
        </View>

        {/* 3. Tabla de Especificaciones de la Matriz */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Especificaciones Técnicas (Taller)</Text>
          <View style={styles.table}>
            
            {/* Cabecera */}
            <View style={styles.tableHeader}>
              <View style={[styles.tableCol, styles.col1]}><Text>Prenda / Diseño</Text></View>
              <View style={[styles.tableCol, styles.col2]}><Text>Detalles Técnicos</Text></View>
              <View style={[styles.tableCol, styles.col3]}><Text>Tallas</Text></View>
              <View style={[styles.tableCol, styles.col4]}><Text>Total</Text></View>
            </View>

            {/* Filas basadas en los colores activos */}
            {uniqueColors?.map((color: any, index: number) => {
              const sizesBreakdown = uniqueSizes
                ?.map((size: any) => {
                  const qty = getQuantity(color.id, size.id);
                  if (qty && Number(qty) > 0) {
                    const formattedQty = String(qty).padStart(2, '0');
                    return `${size.abbreviation || size.name}: ${formattedQty} unds.`;
                  }
                  return null;
                })
                .filter(Boolean)
                .join('\n');

              return (
                <View key={color.id} style={styles.tableRow} wrap={false}>
                  {/* Columna 1 */}
                  <View style={[styles.tableCol, styles.col1]}>
                    {index === 0 && (
                      <>
                        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{baseProduct?.name || 'Prenda'}</Text>
                        {baseProduct?.image ? (
                          <Image 
                            src={`https://images.weserv.nl/?url=${baseProduct.image.replace(/^https?:\/\//, '')}`} 
                            style={styles.image} 
                          />
                        ) : (
                          <Text style={{ color: '#94a3b8', fontSize: 8, marginTop: 10 }}>[Sin imagen]</Text>
                        )}
                      </>
                    )}
                  </View>

                  {/* Columna 2 */}
                  <View style={[styles.tableCol, styles.col2]}>
                    <Text style={styles.techText}>• Tela: <Text style={styles.boldTech}>{baseProduct?.fabric || 'No especificado'}</Text></Text>
                    <Text style={styles.techText}>• Color: <Text style={styles.boldTech}>{color.name || 'No especificado'}</Text></Text>
                  </View>

                  {/* Columna 3 */}
                  <View style={[styles.tableCol, styles.col3]}>
                    <Text style={{ lineHeight: 1.4 }}>
                      {sizesBreakdown || '00 unds.'}
                    </Text>
                  </View>

                  {/* Columna 4 */}
                  <View style={[styles.tableCol, styles.col4]}>
                    <Text style={{ fontWeight: 'bold', fontSize: 11 }}>
                      {String(getColorTotal(color.id) || 0).padStart(2, '0')} unds.
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 4. Observaciones del Cliente */}
        <View style={[styles.section, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>Observaciones del Cliente</Text>
          <Text style={{ color: '#334155', lineHeight: 1.5, fontStyle: 'italic' }}>
            {quote?.message ? `"${quote.message}"` : '"Sin observaciones adicionales proporcionadas por el cliente."'}
          </Text>
        </View>

      </Page>

      {/* 📄 HOJA 2: ANEXO VISUAL (Solo si existen imágenes en la orden) */}
      {vistasPrenda.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.gridSectionTitle}>Anexo Visual - Vistas de Producción</Text>
          
          <View style={styles.gridContainer}>
            {vistasPrenda.map((vista, index) => (
              <View key={index} style={styles.gridCard}>
                <Image 
                  src={`https://images.weserv.nl/?url=${vista.url.replace(/^https?:\/\//, '')}`} 
                  style={styles.gridImage} 
                />
                <Text style={styles.gridLabel}>{vista.label}</Text>
              </View>
            ))}
          </View>
        </Page>
      )}
    </Document>
  );
};