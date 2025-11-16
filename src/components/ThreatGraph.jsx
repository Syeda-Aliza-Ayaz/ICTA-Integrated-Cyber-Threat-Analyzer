// // src/components/ThreatGraph.jsx
// import { useEffect, useRef } from 'react';
// import { motion } from 'framer-motion';
// import * as d3 from 'd3';

// export default function ThreatGraph({
//   graphData,
//   mode = 'global',
//   onNodeClick,
//   onPathFind,
//   pathHighlight = [],
//   selectedNode,
//   setSelectedNode,
//   graphKey
// }) {
//   const svgRef = useRef();
//   const zoomRef = useRef(null);
//   const simulationRef = useRef(null);
//   console.log('Graph Mode:', mode);

//   const resetZoom = () => {
//     if (zoomRef.current && svgRef.current) {
//       const g = d3.select(svgRef.current).select('g');
//       if (g) g.attr('transform', d3.zoomIdentity);
//       zoomRef.current.transform(d3.select(svgRef.current), d3.zoomIdentity);
//       console.log('Zoom reset attempted');
//     }
//   };

//   const drag = (simulation) => {
//     function dragstarted(event, d) {
//       if (!event.active) simulation.alphaTarget(0.3).restart();
//       d.fx = d.x;
//       d.fy = d.y;
//     }
//     function dragged(event, d) {
//       d.fx = event.x;
//       d.fy = event.y;
//     }
//     function dragended(event, d) {
//       if (!event.active) simulation.alphaTarget(0);
//       d.fx = null;
//       d.fy = null;
//     }
//     return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
//   };

//   const getColor = (node) => {
//     // Use node.color if present, fallback to type-based color with case-insensitive check
//     if (node.color) return node.color;
//     const type = node.type?.toLowerCase();
//     if (type === 'ip') return '#06b6d4'; // Cyan
//     if (type === 'domain') return '#8b5cf6'; // Purple
//     if (type === 'hash') return '#ec4899'; // Pink
//     return '#94a3b8'; // Gray for Unknown
//   };

//   useEffect(() => {
//     const svg = d3.select(svgRef.current);
//     svg.selectAll('*').remove();
//     svg.on('.zoom', null);
//     if (simulationRef.current) simulationRef.current.stop();

//     if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
//       svg.append('text')
//         .attr('x', '50%')
//         .attr('y', '50%')
//         .attr('text-anchor', 'middle')
//         .attr('fill', '#64748b')
//         .text('No graph data available');
//       return;
//     }

//     const width = svgRef.current.parentElement.offsetWidth;
//     const height = 600;

//     const g = svg.append('g');

//     const zoom = d3.zoom()
//       .scaleExtent([0.1, 4])
//       .on('zoom', (e) => g.attr('transform', e.transform));
//     svg.call(zoom);
//     zoomRef.current = zoom;

//     const simulation = d3.forceSimulation(graphData.nodes)
//       .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(120))
//       .force('charge', d3.forceManyBody().strength(-600))
//       .force('center', d3.forceCenter(width / 2, height / 2))
//       .force('collision', d3.forceCollide().radius(d => 15 + d.score / 6));

//     const link = g.append('g')
//       .selectAll('line')
//       .data(graphData.links)
//       .join('line')
//       .attr('stroke', d =>
//         pathHighlight.includes(d.source.id) && pathHighlight.includes(d.target.id)
//           ? '#f59e0b' : '#374151'
//       )
//       .attr('stroke-width', d =>
//         pathHighlight.includes(d.source.id) && pathHighlight.includes(d.target.id) ? 6 : 2
//       )
//       .attr('stroke-opacity', 0.7);

//     const node = g.append('g')
//       .selectAll('g')
//       .data(graphData.nodes)
//       .join('g')
//       .call(drag(simulation));

//     node.append('circle')
//       .attr('r', d => 10 + d.score / 8)
//       .attr('fill', d => getColor(d))
//       .attr('stroke', d => selectedNode?.id === d.id ? '#fff' : 'none')
//       .attr('stroke-width', d => selectedNode?.id === d.id ? 5 : 0)
//       .style('cursor', 'pointer')
//       .on('click', (e, d) => {
//         setSelectedNode(d);
//         if (onNodeClick) onNodeClick(d);
//       });

//     node.append('text')
//       .text(d => d.label || d.id)
//       .attr('x', 18)
//       .attr('y', 4)
//       .attr('font-size', '12px')
//       .attr('fill', '#e2e8f0')
//       .attr('font-weight', '500');

//     simulation.on('tick', () => {
//       link
//         .attr('x1', d => d.source.x)
//         .attr('y1', d => d.source.y)
//         .attr('x2', d => d.target.x)
//         .attr('y2', d => d.target.y);
//       node.attr('transform', d => `translate(${d.x},${d.y})`);
//     });

//     // NEW: Log node details for debugging
//     console.log('Graph Data Nodes:', graphData.nodes.map(n => ({ id: n.id, type: n.type, color: n.color })));

//     simulationRef.current = simulation;

//     return () => {
//       if (simulationRef.current) {
//         simulationRef.current.stop();
//         simulationRef.current = null;
//       }
//       svg.selectAll('*').remove();
//       svg.on('.zoom', null);
//     };
//   }, [graphData, pathHighlight, selectedNode, onNodeClick, setSelectedNode, graphKey]);

//   // const exportPNG = () => {
//   //   const svg = svgRef.current;
//   //   const serializer = new XMLSerializer();
//   //   const source = serializer.serializeToString(svg);
//   //   const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
//   //   const url = URL.createObjectURL(blob);
//   //   const img = new Image();
//   //   img.onload = () => {
//   //     // Calculate bounds of all nodes
//   //     const nodes = graphData.nodes;
//   //     const minX = Math.min(...nodes.map(n => n.x || 0)) - 50;
//   //     const maxX = Math.max(...nodes.map(n => n.x || 0)) + 50;
//   //     const minY = Math.min(...nodes.map(n => n.y || 0)) - 50;
//   //     const maxY = Math.max(...nodes.map(n => n.y || 0)) + 50;
//   //     const width = maxX - minX;
//   //     const height = maxY - minY;

//   //     const canvas = document.createElement('canvas');
//   //     canvas.width = width;
//   //     canvas.height = height;
//   //     const ctx = canvas.getContext('2d');
//   //     ctx.fillStyle = 'rgba(14, 15, 17, 0.8)';
//   //     ctx.fillRect(0, 0, width, height);
//   //     ctx.translate(-minX, -minY); // Offset to fit all nodes
//   //     ctx.drawImage(img, 0, 0);

//   //     canvas.toBlob(blob => {
//   //       const a = document.createElement('a');
//   //       a.href = URL.createObjectURL(blob);
//   //       a.download = `threat-graph-${mode}.png`;
//   //       a.click();
//   //     });
//   //   };
//   //   img.src = url;
//   // };

//   // inside ThreatGraph component (place near resetZoom or helper funcs)
//   const exportPNG = async (filename = `threat-graph-${Date.now()}.png`) => {
//     const svgEl = svgRef.current;
//     if (!svgEl) return alert('Graph not ready');

//     // Compute target width/height (use parent container width and your fixed svg height)
//     const targetWidth = svgEl.parentElement?.offsetWidth || 1200;
//     const targetHeight = parseInt(svgEl.getAttribute('height')) || 600;

//     // Clone SVG to avoid messing with live svg (and ensure width/height/viewBox present)
//     const clone = svgEl.cloneNode(true);

//     // Ensure xmlns
//     if (!clone.getAttribute('xmlns')) {
//       clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
//     }

//     // Set explicit width/height & viewBox so rasterizer knows dimensions
//     clone.setAttribute('width', targetWidth);
//     clone.setAttribute('height', targetHeight);
//     if (!clone.getAttribute('viewBox')) {
//       clone.setAttribute('viewBox', `0 0 ${targetWidth} ${targetHeight}`);
//     }

//     // Add a background rect so result doesn't have transparency issues
//     const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
//     bgRect.setAttribute('x', '0');
//     bgRect.setAttribute('y', '0');
//     bgRect.setAttribute('width', targetWidth.toString());
//     bgRect.setAttribute('height', targetHeight.toString());
//     bgRect.setAttribute('fill', '#0f1013'); // same as your app bg
//     clone.insertBefore(bgRect, clone.firstChild);

//     // Serialize
//     const serialized = new XMLSerializer().serializeToString(clone);
//     const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
//     const url = URL.createObjectURL(blob);

//     // Create image and draw to canvas
//     const img = new Image();
//     // If you serve fonts/CORS resources, you can set crossOrigin. Keep it unless needed.
//     // img.crossOrigin = 'anonymous';

//     img.onload = () => {
//       try {
//         const canvas = document.createElement('canvas');
//         // For crispness, allow devicePixelRatio scaling
//         const scale = window.devicePixelRatio || 2;
//         canvas.width = Math.round(targetWidth * scale);
//         canvas.height = Math.round(targetHeight * scale);
//         canvas.style.width = `${targetWidth}px`;
//         canvas.style.height = `${targetHeight}px`;

//         const ctx = canvas.getContext('2d');
//         // fill background (in case)
//         ctx.fillStyle = '#0f1013';
//         ctx.fillRect(0, 0, canvas.width, canvas.height);

//         ctx.setTransform(scale, 0, 0, scale, 0, 0); // scale drawing for high DPI
//         ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

//         // trigger download
//         canvas.toBlob((blob) => {
//           if (!blob) {
//             URL.revokeObjectURL(url);
//             return alert('Failed to create PNG');
//           }
//           const link = document.createElement('a');
//           link.href = URL.createObjectURL(blob);
//           link.download = filename;
//           link.click();
//           URL.revokeObjectURL(url);
//         }, 'image/png');
//       } catch (err) {
//         console.error('exportPNG error', err);
//         alert('Failed to export PNG — see console');
//       }
//     };

//     img.onerror = (e) => {
//       console.error('Image load error', e);
//       URL.revokeObjectURL(url);
//       alert('Failed to load SVG as image');
//     };

//     img.src = url;
//   };


//   // return (
//   //   <div className="relative bg-[#1a1b1e]/80 rounded-2xl p-4 border border-cyan-500/10 shadow-2xl">
//   //     <div className="flex justify-between items-center mb-3 px-2">
//   //       <h3 className="text-white font-bold text-lg">
//   //         {mode === 'global'
//   //           ? 'Global Threat Network'
//   //           : mode === 'cluster'
//   //             ? `Cluster: ${selectedNode?.label || selectedNode?.id || '...'}`
//   //             : mode === 'type'
//   //               ? `Top ${selectedNode?.id || 'Threats'}`
//   //               : 'Threat Graph'
//   //         }
//   //       </h3>
//   //       <div className="flex gap-2">
//   //         <button onClick={exportPNG} className="text-cyan-400 hover:text-pink-400 text-sm">Export PNG</button>
//   //         <button onClick={resetZoom} className="text-cyan-400 hover:text-pink-400 text-sm">Reset Zoom</button>
//   //       </div>
//   //     </div>

//   //     <motion.svg
//   //       ref={svgRef}
//   //       width="100%"
//   //       height="600"
//   //       initial={{ opacity: 0 }}
//   //       animate={{ opacity: 1 }}
//   //       transition={{ duration: 0.4 }}
//   //       className="rounded-xl bg-[#0f1013]/50 cursor-grab active:cursor-grabbing"
//   //     />
//   //     <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30 text-xs">
//   //       <h4 className="text-white font-bold mb-2">Legend</h4>
//   //       <div className="space-y-1">
//   //         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#06b6d4]"></div><span className="text-gray-300">IP Address</span></div>
//   //         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div><span className="text-gray-300">Domain</span></div>
//   //         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ec4899]"></div><span className="text-gray-300">Hash</span></div>
//   //         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#94a3b8]"></div><span className="text-gray-300">Unknown</span></div>
//   //       </div>
//   //       <p className="text-gray-400 mt-2">Node Size = Threat Score</p>
//   //     </div>

//   //     {mode === 'cluster' && selectedNode && (
//   //       <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-sm p-4 rounded-xl border border-amber-500/30 text-xs">
//   //         <button onClick={() => onPathFind && onPathFind(selectedNode)} className="text-amber-400 hover:text-amber-300">
//   //           Find Path from Root
//   //         </button>
//   //       </div>
//   //     )}

//   //     {selectedNode && (
//   //       <div className="absolute top-16 left-4 bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30 text-sm max-w-xs">
//   //         <p className="text-white font-bold break-all">{selectedNode.id}</p>
//   //         <p className="text-cyan-400">Type: {selectedNode.type}</p>
//   //         <p className="text-yellow-400">Score: {selectedNode.score}/100</p>
//   //       </div>
//   //     )}
//   //   </div>
//   // );

//   // Replace the return section
//   return (
//     <div className="graph-wrapper relative bg-[#1a1b1e]/80 rounded-2xl p-4 border border-cyan-500/10 shadow-2xl">
//       <div className="flex justify-between items-center mb-3 px-2">
//         <h3 className="text-white font-bold text-lg">
//           {mode === 'global'
//             ? 'Global Threat Network'
//             : mode === 'cluster'
//               ? `Cluster: ${selectedNode?.label || selectedNode?.id || '...'}`
//               : mode === 'type'
//                 ? `Top ${selectedNode?.id || 'Threats'}`
//                 : 'Threat Graph'
//           }
//         </h3>
//         <div className="flex gap-2">
//           <button onClick={() => exportPNG()} className="text-cyan-400 hover:text-pink-400 text-sm">
//             Download PNG
//           </button>
//           <button onClick={resetZoom} className="text-cyan-400 hover:text-pink-400 text-sm">
//             Reset Zoom
//           </button>
//         </div>
//       </div>

//       <motion.svg
//         ref={svgRef}
//         width="100%"
//         height="600"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ duration: 0.4 }}
//         className="rounded-xl bg-[#0f1013]/50 cursor-grab active:cursor-grabbing"
//       />
//       <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30 text-xs">
//         <h4 className="text-white font-bold mb-2">Legend</h4>
//         <div className="space-y-1">
//           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#06b6d4]"></div><span className="text-gray-300">IP Address</span></div>
//           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div><span className="text-gray-300">Domain</span></div>
//           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ec4899]"></div><span className="text-gray-300">Hash</span></div>
//           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#94a3b8]"></div><span className="text-gray-300">Unknown</span></div>
//         </div>
//         <p className="text-gray-400 mt-2">Node Size = Threat Score</p>
//       </div>

//       {mode === 'cluster' && selectedNode && (
//         <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-sm p-4 rounded-xl border border-amber-500/30 text-xs">
//           <button onClick={() => onPathFind && onPathFind(selectedNode)} className="text-amber-400 hover:text-amber-300">
//             Find Path from Root
//           </button>
//         </div>
//       )}

//       {selectedNode && (
//         <div className="absolute top-16 left-4 bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30 text-sm max-w-xs">
//           <p className="text-white font-bold break-all">{selectedNode.id}</p>
//           <p className="text-cyan-400">Type: {selectedNode.type}</p>
//           <p className="text-yellow-400">Score: {selectedNode.score}/100</p>
//         </div>
//       )}
//     </div>
//   );
// }

// src/components/ThreatGraph.jsx
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

export default function ThreatGraph({
  graphData,
  mode = 'global',
  onNodeClick,
  onPathFind,
  pathHighlight = [],
  selectedNode,
  setSelectedNode,
  graphKey
}) {
  const svgRef = useRef();
  const zoomRef = useRef(null);
  const simulationRef = useRef(null);
  console.log('Graph Mode:', mode);

  const resetZoom = () => {
    if (zoomRef.current && svgRef.current) {
      const g = d3.select(svgRef.current).select('g');
      if (g) g.attr('transform', d3.zoomIdentity);
      zoomRef.current.transform(d3.select(svgRef.current), d3.zoomIdentity);
      console.log('Zoom reset attempted');
    }
  };

  const drag = (simulation) => {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
  };

  // const getColor = (node) => {
  //   // Use node.color if present, fallback to type-based color with case-insensitive check
  //   if (node.color) return node.color;
  //   const type = node.type?.toLowerCase();
  //   if (type === 'ip') return '#06b6d4'; // Cyan
  //   if (type === 'domain') return '#8b5cf6'; // Purple
  //   if (type === 'hash') return '#ec4899'; // Pink
  //   if (type === 'url') return '#10b981'; // Emerald
  //   if (type === 'email address') return '#f97316'; // Orange
  //   if (type === 'file path') return '#8b5cf6'; // Indigo (distinct from domain)
  //   if (type === 'registry key') return '#f59e0b'; // Amber
  //   if (type === 'mac address') return '#34d399'; // Lime
  //   if (type === 'certificate fingerprint') return '#a855f7'; // Violet
  //   if (type === 'user agent') return '#ef4444'; // Red
  //   return '#94a3b8'; // Gray for Unknown
  // };

  const getColor = (node) => {
    const type = node.type?.toLowerCase() || '';

    if (type.includes('ip')) return '#06b6d4';
    if (type.includes('domain')) return '#8b5cf6';
    if (type.includes('hash')) return '#ec4899';
    if (type.includes('url')) return '#10b981';
    if (type.includes('email')) return '#f97316';
    if (type.includes('file')) return '#8b5cf6';
    if (type.includes('registry')) return '#f59e0b';
    if (type.includes('mac')) return '#34d399';
    if (type.includes('certificate')) return '#a855f7';
    if (type.includes('agent')) return '#ef4444';

    return '#94a3b8';
  };

  useEffect(() => {
    graphData.nodes.forEach(n => {
      if (n.type) n.type = n.type.toLowerCase().trim();
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.on('.zoom', null);
    if (simulationRef.current) simulationRef.current.stop();

    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      svg.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .text('No graph data available');
      return;
    }

    const width = svgRef.current.parentElement.offsetWidth;
    const height = 600;

    const g = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => 15 + d.score / 6));

    const link = g.append('g')
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('stroke', d =>
        pathHighlight.includes(d.source.id) && pathHighlight.includes(d.target.id)
          ? '#f59e0b' : '#374151'
      )
      .attr('stroke-width', d =>
        pathHighlight.includes(d.source.id) && pathHighlight.includes(d.target.id) ? 6 : 2
      )
      .attr('stroke-opacity', 0.7);

    const node = g.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .join('g')
      .call(drag(simulation));

    node.append('circle')
      .attr('r', d => 10 + d.score / 8)
      .attr('fill', d => getColor(d))
      .attr('stroke', d => selectedNode?.id === d.id ? '#fff' : 'none')
      .attr('stroke-width', d => selectedNode?.id === d.id ? 5 : 0)
      .style('cursor', 'pointer')
      .on('click', (e, d) => {
        setSelectedNode(d);
        if (onNodeClick) onNodeClick(d);
      });

    node.append('text')
      .text(d => d.label || d.id)
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', '#e2e8f0')
      .attr('font-weight', '500');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // NEW: Log node details for debugging
    console.log('Graph Data Nodes:', graphData.nodes.map(n => ({ id: n.id, type: n.type, color: n.color })));

    simulationRef.current = simulation;

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [graphData, pathHighlight, selectedNode, onNodeClick, setSelectedNode, graphKey]);

  const exportPNG = async (filename = `threat-graph-${Date.now()}.png`) => {
    const svgEl = svgRef.current;
    if (!svgEl) return alert('Graph not ready');

    const targetWidth = svgEl.parentElement?.offsetWidth || 1200;
    const targetHeight = parseInt(svgEl.getAttribute('height')) || 600;

    const clone = svgEl.cloneNode(true);

    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    clone.setAttribute('width', targetWidth);
    clone.setAttribute('height', targetHeight);
    if (!clone.getAttribute('viewBox')) {
      clone.setAttribute('viewBox', `0 0 ${targetWidth} ${targetHeight}`);
    }

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', targetWidth.toString());
    bgRect.setAttribute('height', targetHeight.toString());
    bgRect.setAttribute('fill', '#0f1013');
    clone.insertBefore(bgRect, clone.firstChild);

    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = window.devicePixelRatio || 2;
        canvas.width = Math.round(targetWidth * scale);
        canvas.height = Math.round(targetHeight * scale);
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${targetHeight}px`;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0f1013';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob((blob) => {
          if (!blob) {
            URL.revokeObjectURL(url);
            return alert('Failed to create PNG');
          }
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      } catch (err) {
        console.error('exportPNG error', err);
        alert('Failed to export PNG — see console');
      }
    };

    img.onerror = (e) => {
      console.error('Image load error', e);
      URL.revokeObjectURL(url);
      alert('Failed to load SVG as image');
    };

    img.src = url;
  };

  return (
    <div className="graph-wrapper relative bg-[#1a1b1e]/80 rounded-2xl p-4 border border-cyan-500/10 shadow-2xl">
      <div className="flex justify-between items-center mb-3 px-2">
        <h3 className="text-white font-bold text-lg">
          {mode === 'global'
            ? 'Global Threat Network'
            : mode === 'cluster'
              ? `Cluster: ${selectedNode?.label || selectedNode?.id || '...'}`
              : mode === 'type'
                ? `Top ${selectedNode?.id || 'Threats'}`
                : 'Threat Graph'
          }
        </h3>
        <div className="flex gap-2">
          <button onClick={() => exportPNG()} className="text-cyan-400 hover:text-pink-400 text-sm">
            Download PNG
          </button>
          <button onClick={resetZoom} className="text-cyan-400 hover:text-pink-400 text-sm">
            Reset Zoom
          </button>
        </div>
      </div>

      <motion.svg
        ref={svgRef}
        width="100%"
        height="600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl bg-[#0f1013]/50 cursor-grab active:cursor-grabbing"
      />
      <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30 text-xs">
        <h4 className="text-white font-bold mb-2">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#06b6d4]"></div><span className="text-gray-300">IP Address</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div><span className="text-gray-300">Domain</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ec4899]"></div><span className="text-gray-300">Hash</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div><span className="text-gray-300">URL</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f97316]"></div><span className="text-gray-300">Email Address</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#6366f1]"></div><span className="text-gray-300">File Path</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div><span className="text-gray-300">Registry Key</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#34d399]"></div><span className="text-gray-300">MAC Address</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#a855f7]"></div><span className="text-gray-300">Certificate Fingerprint</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div><span className="text-gray-300">User Agent</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#94a3b8]"></div><span className="text-gray-300">Unknown</span></div>
        </div>
        <p className="text-gray-400 mt-2">Node Size = Threat Score</p>
      </div>

      {mode === 'cluster' && selectedNode && (
        <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-sm p-4 rounded-xl border border-amber-500/30 text-xs">
          <button onClick={() => onPathFind && onPathFind(selectedNode)} className="text-amber-400 hover:text-amber-300">
            Find Path from Root
          </button>
        </div>
      )}

      {selectedNode && (
        <div className="absolute top-16 left-4 bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30 text-sm max-w-xs">
          <p className="text-white font-bold break-all">{selectedNode.id}</p>
          <p className="text-cyan-400">Type: {selectedNode.type}</p>
          <p className="text-yellow-400">Score: {selectedNode.score}/100</p>
        </div>
      )}
    </div>
  );
}