import React from 'react';
import './DocumentSuite.css';

const STORAGE_KEY = 'BALANCE_V1_documents';

const defaultState = {
  documents: [
    { 
      id: 'doc_1', 
      name: 'Bienvenida', 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(),
      sheets: [
        { id: 'sheet_1', name: 'Hoja 1', content: '<h1>Bienvenido a Document Suite</h1><p>Crea, edita y guarda documentos con múltiples hojas.</p>' },
      ],
      activeSheetId: 'sheet_1',
    },
  ],
  activeDocId: 'doc_1',
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : defaultState;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function DocumentSuite() {
  const [state, setState] = React.useState(loadState);
  const [content, setContent] = React.useState('');
  const [docName, setDocName] = React.useState('');
  const [showNewDoc, setShowNewDoc] = React.useState(false);
  const [newDocName, setNewDocName] = React.useState('');
  const [showNewSheet, setShowNewSheet] = React.useState(false);
  const [newSheetName, setNewSheetName] = React.useState('');
  const [showRenameDoc, setShowRenameDoc] = React.useState(false);
  const [renameDocValue, setRenameDocValue] = React.useState('');
  const [showRenameSheet, setShowRenameSheet] = React.useState(false);
  const [renameSheetValue, setRenameSheetValue] = React.useState('');
  const editorRef = React.useRef(null);
  const lastSyncedSheetRef = React.useRef('');

  // Cargar documento y hoja activos
  React.useEffect(() => {
    const activeDoc = state.documents.find(d => d.id === state.activeDocId);
    if (activeDoc) {
      setDocName(activeDoc.name);
      const activeSheet = activeDoc.sheets.find(s => s.id === activeDoc.activeSheetId);
      if (activeSheet) {
        const syncKey = `${activeDoc.id}::${activeSheet.id}::${activeSheet.content}`;
        if (lastSyncedSheetRef.current !== syncKey) {
          setContent(activeSheet.content || '<p></p>');
          if (editorRef.current && editorRef.current.innerHTML !== (activeSheet.content || '<p></p>')) {
            editorRef.current.innerHTML = activeSheet.content || '<p></p>';
          }
          lastSyncedSheetRef.current = syncKey;
        }
      }
    }
  }, [state.activeDocId, state.documents]);

  // Guardar estado en localStorage
  React.useEffect(() => {
    saveState(state);
  }, [state]);

  // Auto-save cada 5 segundos
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (state.activeDocId) {
        setState(prev => ({
          ...prev,
          documents: prev.documents.map(d => {
            if (d.id === prev.activeDocId) {
              return {
                ...d,
                sheets: d.sheets.map(s =>
                  s.id === d.activeSheetId
                    ? { ...s, content }
                    : s
                ),
                updatedAt: new Date().toISOString(),
              };
            }
            return d;
          }),
        }));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [content, state.activeDocId]);

  const createNewDocument = (e) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    const newId = `doc_${Date.now()}`;
    const sheetId = `sheet_${Date.now()}`;
    const newDoc = {
      id: newId,
      name: newDocName.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sheets: [
        { id: sheetId, name: 'Hoja 1', content: '<p></p>' },
      ],
      activeSheetId: sheetId,
    };
    setState(prev => ({
      ...prev,
      documents: [...prev.documents, newDoc],
      activeDocId: newId,
    }));
    setNewDocName('');
    setShowNewDoc(false);
  };

  const createNewSheet = (e) => {
    e.preventDefault();
    if (!newSheetName.trim()) return;
    const sheetId = `sheet_${Date.now()}`;
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(d => {
        if (d.id === prev.activeDocId) {
          return {
            ...d,
            sheets: [...d.sheets, { id: sheetId, name: newSheetName.trim(), content: '<p></p>' }],
            activeSheetId: sheetId,
          };
        }
        return d;
      }),
    }));
    setNewSheetName('');
    setShowNewSheet(false);
  };

  const switchDocument = (docId) => {
    // Guardar documento actual antes de cambiar
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(d => {
        if (d.id === prev.activeDocId) {
          return {
            ...d,
            sheets: d.sheets.map(s =>
              s.id === d.activeSheetId
                ? { ...s, content }
                : s
            ),
          };
        }
        return d;
      }),
      activeDocId: docId,
    }));
  };

  const switchSheet = (sheetId) => {
    // Guardar hoja actual antes de cambiar
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(d => {
        if (d.id === prev.activeDocId) {
          return {
            ...d,
            sheets: d.sheets.map(s =>
              s.id === d.activeSheetId
                ? { ...s, content }
                : s
            ),
            activeSheetId: sheetId,
          };
        }
        return d;
      }),
    }));
  };

  const deleteDocument = (docId) => {
    if (window.confirm('¿Borrar este documento definitivamente?')) {
      setState(prev => {
        const remaining = prev.documents.filter(d => d.id !== docId);
        return {
          ...prev,
          documents: remaining,
          activeDocId: remaining[0]?.id || '',
        };
      });
    }
  };

  const deleteSheet = (sheetId) => {
    const activeDoc = state.documents.find(d => d.id === state.activeDocId);
    if (activeDoc && activeDoc.sheets.length > 1) {
      if (window.confirm('¿Borrar esta hoja?')) {
        setState(prev => ({
          ...prev,
          documents: prev.documents.map(d => {
            if (d.id === prev.activeDocId) {
              const remaining = d.sheets.filter(s => s.id !== sheetId);
              return {
                ...d,
                sheets: remaining,
                activeSheetId: remaining[0]?.id || '',
              };
            }
            return d;
          }),
        }));
      }
    } else {
      alert('Debes tener al menos una hoja en el documento.');
    }
  };

  const renameDocument = (docId, newName) => {
    if (newName.trim()) {
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(d =>
          d.id === docId ? { ...d, name: newName.trim() } : d
        ),
      }));
    }
    setShowRenameDoc(false);
  };

  const renameSheet = (sheetId, newName) => {
    if (newName.trim()) {
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(d => {
          if (d.id === prev.activeDocId) {
            return {
              ...d,
              sheets: d.sheets.map(s =>
                s.id === sheetId ? { ...s, name: newName.trim() } : s
              ),
            };
          }
          return d;
        }),
      }));
    }
    setShowRenameSheet(false);
  };

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const exportToPDF = () => {
    const element = editorRef.current;
    if (!element) return;

    const html = element.innerHTML;
    const printWindow = window.open('', '', 'width=1000,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>${docName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1, h2, h3 { color: #333; }
            p { color: #555; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const exportToTXT = () => {
    const plainText = editorRef.current?.innerText || '';
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(plainText));
    element.setAttribute('download', `${docName}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportToHTML = () => {
    const html = editorRef.current?.innerHTML || '';
    const fullHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${docName}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
        h1, h2, h3, h4, h5, h6 { color: #333; }
        p { color: #555; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    ${html}
</body>
</html>
    `;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(fullHTML));
    element.setAttribute('download', `${docName}.html`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const duplicateDocument = (docId) => {
    const doc = state.documents.find(d => d.id === docId);
    if (doc) {
      const newId = `doc_${Date.now()}`;
      const newDoc = {
        ...doc,
        id: newId,
        name: `${doc.name} (copia)`,
        createdAt: new Date().toISOString(),
        sheets: doc.sheets.map((s, idx) => ({
          ...s,
          id: `sheet_${Date.now()}_${idx}`,
        })),
        activeSheetId: `sheet_${Date.now()}_0`,
      };
      setState(prev => ({
        ...prev,
        documents: [...prev.documents, newDoc],
      }));
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const activeDoc = state.documents.find(d => d.id === state.activeDocId);

  return (
    <div className="DocumentSuite-root">
      <div className="DocumentSuite-layout">
        {/* Sidebar de documentos */}
        <aside className="DocumentSuite-sidebar">
          <div className="DocumentSuite-sidebarHeader">
            <h3>📄 Documentos</h3>
            <button className="DocumentSuite-addBtn" onClick={() => setShowNewDoc(true)} title="Nuevo documento">
              +
            </button>
          </div>

          {showNewDoc && (
            <form className="DocumentSuite-newDocForm" onSubmit={createNewDocument}>
              <input
                type="text"
                placeholder="Nombre del documento"
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                autoFocus
              />
              <div className="DocumentSuite-formButtons">
                <button type="submit" className="btn-small">Crear</button>
                <button type="button" className="btn-small secondary" onClick={() => setShowNewDoc(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="DocumentSuite-docsList">
            {state.documents.map(doc => (
              <div
                key={doc.id}
                className={`DocumentSuite-docItem ${doc.id === state.activeDocId ? 'active' : ''}`}
              >
                {showRenameDoc && doc.id === state.activeDocId ? (
                  <div className="DocumentSuite-renameForm">
                    <input
                      type="text"
                      value={renameDocValue}
                      onChange={e => setRenameDocValue(e.target.value)}
                      autoFocus
                    />
                    <div className="DocumentSuite-formButtons-tiny">
                      <button onClick={() => renameDocument(doc.id, renameDocValue)}>✓</button>
                      <button onClick={() => setShowRenameDoc(false)}>✕</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      className="DocumentSuite-docButton"
                      onClick={() => switchDocument(doc.id)}
                    >
                      <div className="DocumentSuite-docName">{doc.name}</div>
                      <div className="DocumentSuite-docDate">{formatDate(doc.updatedAt)}</div>
                    </button>
                    <div className="DocumentSuite-docActions">
                      <button
                        className="icon-btn-small"
                        onClick={() => {
                          setRenameDocValue(doc.name);
                          setShowRenameDoc(true);
                        }}
                        title="Renombrar"
                      >
                        ✎
                      </button>
                      <button
                        className="icon-btn-small"
                        onClick={() => duplicateDocument(doc.id)}
                        title="Duplicar"
                      >
                        📋
                      </button>
                      <button
                        className="icon-btn-small delete"
                        onClick={() => deleteDocument(doc.id)}
                        title="Borrar"
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <div className="DocumentSuite-editor">
          <div className="DocumentSuite-editorHeader">
            <h2>{docName || 'Sin título'}</h2>
            <div className="DocumentSuite-info">
              {activeDoc && (
                <>
                  <span className="DocumentSuite-createdDate">
                    Creado: {formatDate(activeDoc.createdAt)}
                  </span>
                  <span className="DocumentSuite-autoSave">💾 Auto-guardado</span>
                </>
              )}
            </div>
          </div>

          {/* Tabs de Hojas */}
          <div className="DocumentSuite-sheetsTabs">
            {activeDoc && activeDoc.sheets.map(sheet => (
              <div key={sheet.id} className={`DocumentSuite-sheetTab ${sheet.id === activeDoc.activeSheetId ? 'active' : ''}`}>
                {showRenameSheet && sheet.id === activeDoc.activeSheetId ? (
                  <input
                    type="text"
                    value={renameSheetValue}
                    onChange={e => setRenameSheetValue(e.target.value)}
                    onBlur={() => renameSheet(sheet.id, renameSheetValue)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') renameSheet(sheet.id, renameSheetValue);
                      if (e.key === 'Escape') setShowRenameSheet(false);
                    }}
                    autoFocus
                    className="DocumentSuite-renameSheetInput"
                  />
                ) : (
                  <>
                    <button
                      className="DocumentSuite-sheetButton"
                      onClick={() => switchSheet(sheet.id)}
                    >
                      {sheet.name}
                    </button>
                    {sheet.id === activeDoc.activeSheetId && (
                      <div className="DocumentSuite-sheetActions">
                        <button
                          className="sheet-icon-btn"
                          onClick={() => {
                            setRenameSheetValue(sheet.name);
                            setShowRenameSheet(true);
                          }}
                          title="Renombrar"
                        >
                          ✎
                        </button>
                        {activeDoc.sheets.length > 1 && (
                          <button
                            className="sheet-icon-btn delete"
                            onClick={() => deleteSheet(sheet.id)}
                            title="Borrar"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {activeDoc && (
              <button
                className="DocumentSuite-addSheetBtn"
                onClick={() => setShowNewSheet(true)}
                title="Nueva hoja"
              >
                +
              </button>
            )}
          </div>

          {showNewSheet && (
            <form className="DocumentSuite-newSheetForm" onSubmit={createNewSheet}>
              <input
                type="text"
                placeholder="Nombre de la hoja"
                value={newSheetName}
                onChange={e => setNewSheetName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-small">Crear</button>
              <button type="button" className="btn-small secondary" onClick={() => setShowNewSheet(false)}>
                Cancelar
              </button>
            </form>
          )}

          {/* Toolbar de formato */}
          <div className="DocumentSuite-toolbar">
            <div className="DocumentSuite-toolGroup">
              <button
                className="tool-btn"
                onClick={() => applyFormat('bold')}
                title="Negrita (Ctrl+B)"
              >
                <strong>B</strong>
              </button>
              <button
                className="tool-btn"
                onClick={() => applyFormat('italic')}
                title="Cursiva (Ctrl+I)"
              >
                <em>I</em>
              </button>
              <button
                className="tool-btn"
                onClick={() => applyFormat('underline')}
                title="Subrayado (Ctrl+U)"
              >
                <u>U</u>
              </button>
              <button
                className="tool-btn"
                onClick={() => applyFormat('strikethrough')}
                title="Tachado"
              >
                <s>S</s>
              </button>
            </div>

            <div className="DocumentSuite-toolGroup">
              <select
                onChange={e => applyFormat('formatBlock', e.target.value)}
                defaultValue="p"
                className="tool-select"
              >
                <option value="p">Párrafo</option>
                <option value="h1">Encabezado 1</option>
                <option value="h2">Encabezado 2</option>
                <option value="h3">Encabezado 3</option>
                <option value="h4">Encabezado 4</option>
                <option value="blockquote">Cita</option>
              </select>
            </div>

            <div className="DocumentSuite-toolGroup">
              <button
                className="tool-btn"
                onClick={() => applyFormat('insertUnorderedList')}
                title="Lista sin ordenar"
              >
                • Lista
              </button>
              <button
                className="tool-btn"
                onClick={() => applyFormat('insertOrderedList')}
                title="Lista ordenada"
              >
                1. Lista
              </button>
              <button
                className="tool-btn"
                onClick={() => applyFormat('indent')}
                title="Aumentar sangría"
              >
                →
              </button>
              <button
                className="tool-btn"
                onClick={() => applyFormat('outdent')}
                title="Disminuir sangría"
              >
                ←
              </button>
            </div>

            <div className="DocumentSuite-toolGroup">
              <button
                className="tool-btn"
                onClick={() => applyFormat('justifyLeft')}
                title="Alinear izquierda"
              >
                ⬅
              </button>
              <button
                className="tool-btn"
                onClick={() => applyFormat('justifyCenter')}
                title="Centrar"
              >
                ⬍
              </button>
              <button
                className="tool-btn"
                onClick={() => applyFormat('justifyRight')}
                title="Alinear derecha"
              >
                ➡
              </button>
              <button
                className="tool-btn"
                onClick={() => applyFormat('justifyFull')}
                title="Justificar"
              >
                ⊟
              </button>
            </div>

            <div className="DocumentSuite-toolGroup">
              <button className="tool-btn" onClick={() => applyFormat('undo')} title="Deshacer">
                ↶
              </button>
              <button className="tool-btn" onClick={() => applyFormat('redo')} title="Rehacer">
                ↷
              </button>
            </div>

            <div className="DocumentSuite-toolGroup">
              <button className="tool-btn export" onClick={exportToPDF} title="Exportar a PDF">
                📄 PDF
              </button>
              <button className="tool-btn export" onClick={exportToHTML} title="Exportar a HTML">
                🌐 HTML
              </button>
              <button className="tool-btn export" onClick={exportToTXT} title="Exportar a TXT">
                📝 TXT
              </button>
            </div>
          </div>

          {/* Área de edición */}
          <div
            ref={editorRef}
            className="DocumentSuite-editorArea"
            contentEditable={true}
            suppressContentEditableWarning={true}
            onInput={e => setContent(e.currentTarget.innerHTML)}
          />
        </div>
      </div>
    </div>
  );
}
