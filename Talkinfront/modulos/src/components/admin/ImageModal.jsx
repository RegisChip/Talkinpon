import React, { useState } from 'react';

const ImageModal = ({ isOpen, onClose, edificio, onImageUpdated }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido');
        return;
      }

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar los 5MB');
        return;
      }

      setSelectedFile(file);
      setError(null);

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Por favor selecciona una imagen');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('edificio_imagen', selectedFile);

    try {
      const response = await fetch(
        `http://localhost:8000/api/rest/edificios/${edificio.id_edificio}/upload_image/`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert('Imagen cargada exitosamente');
        setSelectedFile(null);
        setPreviewUrl(null);
        if (onImageUpdated) onImageUpdated(data);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar la imagen');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de eliminar esta imagen?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/rest/edificios/${edificio.id_edificio}/delete_image/`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        alert('Imagen eliminada exitosamente');
        if (onImageUpdated) onImageUpdated({ ...edificio, edificio_imagen_url: null });
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al eliminar la imagen');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const currentImage = edificio?.edificio_imagen_url;
  const displayImage = previewUrl || currentImage;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1d3557' }}>
            <i className="bi bi-image" style={{ marginRight: '8px' }}></i>
            Imagen del Edificio {edificio?.nombre}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '6px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="bi bi-exclamation-triangle-fill"></i>
              {error}
            </div>
          )}

          {/* Image Preview */}
          <div style={{
            width: '100%',
            minHeight: '300px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            border: '2px dashed #ddd',
            overflow: 'hidden'
          }}>
            {displayImage ? (
              <img 
                src={displayImage}
                alt={`Edificio ${edificio?.nombre}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#999',
                padding: '40px'
              }}>
                <i className="bi bi-image" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}></i>
                <p style={{ margin: 0 }}>No hay imagen cargada</p>
              </div>
            )}
          </div>

          {/* File Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#333'
            }}>
              <i className="bi bi-upload" style={{ marginRight: '6px' }}></i>
              Seleccionar nueva imagen:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                backgroundColor: loading ? '#f5f5f5' : 'white'
              }}
            />
            <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
              Formatos: JPG, PNG, GIF. Tamaño máximo: 5MB
            </small>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {/* Upload Button */}
            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '12px 20px',
                  backgroundColor: loading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#218838')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#28a745')}
              >
                {loading ? (
                  <>
                    <i className="bi bi-hourglass-split"></i>
                    Cargando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-upload-fill"></i>
                    Cargar Imagen
                  </>
                )}
              </button>
            )}

            {/* Delete Button */}
            {currentImage && !previewUrl && (
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '12px 20px',
                  backgroundColor: loading ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#c82333')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#dc3545')}
              >
                <i className="bi bi-trash-fill"></i>
                Eliminar Imagen
              </button>
            )}

            {/* Cancel Button */}
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '12px 20px',
                backgroundColor: loading ? '#ccc' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#5a6268')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#6c757d')}
            >
              <i className="bi bi-x-circle"></i>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;