import React, { useState } from "react";
import { ImageOff } from "lucide-react";

interface Props {
  src?: string;
  alt?: string;
  className?: string;
  primaryColor: string;
}

/**
 * Antes: <img src={content.thumbnail_url || "https://images.unsplash.com/photo-...")} />
 * Esa URL de Unsplash era literalmente una foto de stock "de relleno" escrita en el
 * código — por eso se veía la misma imagen "demo" en todas las tarjetas cuando
 * faltaba (o fallaba) la miniatura real. Aquí se reemplaza por un placeholder
 * neutro de marca, y si la URL real existe pero falla al cargar (link roto/expirado)
 * también se degrada limpiamente en vez de mostrar un ícono de imagen rota.
 */
export const ContentThumb: React.FC<Props> = ({ src, alt = "", className = "", primaryColor }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 ${className}`} style={{ backgroundColor: `${primaryColor}08` }}>
        <ImageOff size={16} style={{ color: `${primaryColor}55` }} />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />;
};
