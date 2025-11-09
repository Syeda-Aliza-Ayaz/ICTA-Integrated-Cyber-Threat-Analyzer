import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

export default function ThreatGraph({
  graphData,
  mode = 'global', // Default to 'global' if not provided
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
  console.log('Graph Mode:', mode); // Debug log to verify mode

  const resetZoom = () => {
    if (zoomRef.current && svgRef.current) {
      const g = d3.select(svgRef.current).select('g');
      if (g) {
        g.attr('transform', d3.zoomIdentity); // Reset to identity transform
      }
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

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  // ThreatGraph.jsx
  useEffect(() => {
    // === FULL CLEANUP BEFORE NEW RENDER ===
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.on('.zoom', null); // Remove old zoom
    if (simulationRef.current) simulationRef.current.stop();

    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      svg.append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .attr("fill", "#64748b")
        .text("No graph data available");
      return;
    }

    const width = svgRef.current.parentElement.offsetWidth;
    const height = 600;

    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-600))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => 15 + d.score / 6));

    const link = g.append("g")
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke", d =>
        pathHighlight.includes(d.source.id) && pathHighlight.includes(d.target.id)
          ? "#f59e0b" : "#374151"
      )
      .attr("stroke-width", d =>
        pathHighlight.includes(d.source.id) && pathHighlight.includes(d.target.id) ? 6 : 2
      )
      .attr("stroke-opacity", 0.7);

    const node = g.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(drag(simulation));

    node.append("circle")
      .attr("r", d => 10 + d.score / 8)
      .attr("fill", d => getColor(d.type))
      .attr("stroke", d => selectedNode?.id === d.id ? "#fff" : "none")
      .attr("stroke-width", d => selectedNode?.id === d.id ? 5 : 0)
      .style("cursor", "pointer")
      .on("click", (e, d) => {
        setSelectedNode(d);
        if (onNodeClick) onNodeClick(d);
      });

    node.append("text")
      .text(d => d.label || d.id)
      .attr("x", 18)
      .attr("y", 4)
      .attr("font-size", "12px")
      .attr("fill", "#e2e8f0")
      .attr("font-weight", "500");

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // === STORE SIMULATION REF FOR CLEANUP ===
    simulationRef.current = simulation;

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      svg.selectAll("*").remove();
      svg.on('.zoom', null);
    };
  }, [graphData, pathHighlight, selectedNode, onNodeClick, setSelectedNode, graphKey]);

  const getColor = (type) => {
    if (type === "IP") return "#06b6d4";
    if (type === "Domain") return "#8b5cf6";
    if (type === "Hash") return "#ec4899";
    return "#94a3b8";
  };

  useEffect(() => {
    setTimeout(() => resetZoom(), 100); // Let D3 settle
  }, [graphKey]);

  const exportPNG = () => {
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800; canvas.height = 600;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f1013'; ctx.fillRect(0, 0, 800, 600);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `threat-graph-${mode}.png`;
        a.click();
      });
    };
    img.src = url;
  };

  return (
    <div className="relative bg-[#1a1b1e]/80 rounded-2xl p-4 border border-cyan-500/10 shadow-2xl">
      <div className="flex justify-between items-center mb-3 px-2">
        {/* <h3 className="text-white font-bold text-lg">
          {mode === 'global' ? 'Global Threat Network' : `Cluster: ${selectedNode?.label || '...'}`}
        </h3> */}
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
          <button onClick={exportPNG} className="text-cyan-400 hover:text-pink-400 text-sm">Export PNG</button>
          <button onClick={resetZoom} className="text-cyan-400 hover:text-pink-400 text-sm">Reset Zoom</button>
        </div>
      </div>

      {/* <svg ref={svgRef} width="100%" height="600" className="rounded-xl bg-[#0f1013]/50 cursor-grab active:cursor-grabbing" /> */}
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
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-500"></div><span className="text-gray-300">IP Address</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-gray-300">Domain</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-pink-500"></div><span className="text-gray-300">Hash</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-500"></div><span className="text-gray-300">Unknown</span></div>
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