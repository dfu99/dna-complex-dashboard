// Dashboard.jsx

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rawChartData, setRawChartData] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [scaleMode, setScaleMode] = useState('fit');
  const [manualMin, setManualMin] = useState('');
  const [manualMax, setManualMax] = useState('');

  // helper to split on top-level '+' only
  const splitTopLevel = (str, delimiter = '+') => {
    const parts = [];
    let buf = '', depth = 0;
    for (const ch of str) {
      if (ch === '(') { depth++; buf += ch; }
      else if (ch === ')') { depth--; buf += ch; }
      else if (ch === delimiter && depth === 0) {
        parts.push(buf.trim()); buf = '';
      } else buf += ch;
    }
    if (buf) parts.push(buf.trim());
    return parts;
  };

  // load JSON and build rawChartData for current entry
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        setData(Array.isArray(json) ? json : [json]);
        setCurrentIndex(0);
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const entry = data[currentIndex];
    if (!entry?.complex_concentrations) {
      setRawChartData([]);
      return;
    }
    const arr = Object.entries(entry.complex_concentrations)
      .map(([species, conc]) => ({ name: species, concentration: conc }));
    setRawChartData(arr);
  }, [data, currentIndex]);

  const prevEntry = () => setCurrentIndex(i => Math.max(i - 1, 0));
  const nextEntry = () => setCurrentIndex(i => Math.min(i + 1, data.length - 1));

  const entry = data[currentIndex];
  if (!entry) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <input type="file" accept=".json" onChange={handleFileUpload} />
      </div>
    );
  }

  // parse filterText into tokens (semicolon-delimited)
  const tokens = filterText
    .split(';')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // build displayData: either all, or filtered/summed per token
  let displayData = [];
  if (tokens.length === 0) {
    displayData = rawChartData;
  } else {
    tokens.forEach(token => {
      const parts = splitTopLevel(token, '+');
      if (parts.length > 1) {
        const sum = parts.reduce((acc, part) => {
          const m = rawChartData.find(d => d.name === part);
          return acc + (m ? m.concentration : 0);
        }, 0);
        displayData.push({ name: token, concentration: sum });
      } else {
        const m = rawChartData.find(d => d.name === parts[0]);
        if (m) displayData.push(m);
      }
    });
  }

  // compute dynamic Y domain values
  const allVals = displayData.length
    ? displayData.map(d => d.concentration)
    : rawChartData.map(d => d.concentration);
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);

  // determine domain based on scaleMode
  const domainMin = scaleMode === 'fixed' && manualMin !== ''
    ? parseFloat(manualMin) || yMin
    : yMin;
  const domainMax = scaleMode === 'fixed' && manualMax !== ''
    ? parseFloat(manualMax) || (yMax * 1.1)
    : (yMax * 1.1);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <input type="file" accept=".json" onChange={handleFileUpload} />
        <button onClick={prevEntry} disabled={currentIndex === 0}><ChevronLeft /></button>
        <span>Entry {currentIndex + 1} / {data.length}</span>
        <input
          type="number"
          value={currentIndex + 1}
          onChange={e => {
            let v = Number(e.target.value) - 1;
            if (isNaN(v)) return;
            v = Math.max(0, Math.min(data.length - 1, v));
            setCurrentIndex(v);
          }}
          style={{ width: '3rem', textAlign: 'center' }}
        />
        <button onClick={nextEntry} disabled={currentIndex === data.length - 1}><ChevronRight /></button>

        {/* scale mode dropdown */}
        <select
          value={scaleMode}
          onChange={e => setScaleMode(e.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="fit">Fit</option>
          <option value="fixed">Fixed</option>
        </select>

        {/* manual range inputs */}
        {scaleMode === 'fixed' && (
          <>
            <input
              type="text"
              placeholder="min"
              value={manualMin}
              onChange={e => setManualMin(e.target.value)}
              style={{ width: '6rem', padding: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="max"
              value={manualMax}
              onChange={e => setManualMax(e.target.value)}
              style={{ width: '6rem', padding: '0.5rem' }}
            />
          </>
        )}
      </div>

      {/* info panels */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
        <div>
          <h3>Sequences</h3>
          {Object.entries(entry.sequences).map(([k, v]) => (
            <div key={k} style={{ background: '#000', color: '#fff', padding: '0.25rem', margin: '0.25rem 0', fontSize: '0.75rem' }}>
              <strong>{k}:</strong> {v}
            </div>
          ))}
        </div>
        <div>
          <h3>Input Concentrations</h3>
          {Object.entries(entry.input_concentrations).map(([k, v]) => (
            <div key={k} style={{ background: '#000', color: '#fff', padding: '0.25rem', margin: '0.25rem 0', fontSize: '0.75rem' }}>
              <strong>{k}:</strong> {v.toExponential(2)}
            </div>
          ))}
        </div>
        <div>
          <h3>Complex Concentrations</h3>
          {rawChartData.map(d => (
            <div key={d.name} style={{ background: '#000', color: '#fff', padding: '0.25rem', margin: '0.25rem 0', fontSize: '0.75rem' }}>
              <strong>{d.name}:</strong> {d.concentration.toExponential(2)}
            </div>
          ))}
        </div>
      </div>

      {/* filter */}
      <div style={{ padding: '0 1rem 1rem' }}>
        <input
          type="text"
          placeholder="e.g. (analyte);(r0)+(r1);(r2_p0)"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
        />
      </div>

      {/* chart */}
      <div style={{ height: '40%', padding: '1rem', borderTop: '1px solid #ddd' }}>
        <ResponsiveContainer>
          <BarChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
            <YAxis
              scale="log"
              domain={[domainMin, domainMax]}
              tickFormatter={v => v.toExponential(1)}
              allowDataOverflow
            />
            <Tooltip formatter={v => v.toExponential(2)} />
            <Bar dataKey="concentration" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
