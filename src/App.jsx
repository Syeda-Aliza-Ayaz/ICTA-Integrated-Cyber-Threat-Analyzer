// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, RefreshCw, GitBranch } from 'lucide-react';
import { loadWASM } from './wasm';
import ThreatGraph from './components/ThreatGraph';
import { Toaster, toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createPortal } from 'react-dom';

export default function CyberDashboard() {
  const [searchValue, setSearchValue] = useState('');
  const [ioc, setIoc] = useState(null);
  const [topThreats, setTopThreats] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [graphMode, setGraphMode] = useState('global');
  const [graphKey, setGraphKey] = useState(0);
  const [graphData, setGraphData] = useState(null);
  const [pathHighlight, setPathHighlight] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showPathModal, setShowPathModal] = useState(false);
  const [pathSrc, setPathSrc] = useState('');
  const [pathDst, setPathDst] = useState('');
  const [prefixMatches, setPrefixMatches] = useState([]);
  const [isEngineReady, setIsEngineReady] = useState(false); // FIXED
  const prefixRef = useRef(null);
  const prefixInputRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1); // ADD THIS

  // === LOAD WASM + MOCK DATA ===
  useEffect(() => {
    const initApp = async () => {
      try {
        const [mod, mockRes] = await Promise.all([
          loadWASM(),
          fetch('/data/mock_data.json')
        ]);
        if (!mockRes.ok) throw new Error('mock_data.json not found');
        const mockData = await mockRes.json();

        setModule(mod);

        const otxFormat = mockData.map(ioc => ({ indicators: [ioc] }));
        const setData = mod.cwrap('setOTXData', null, ['string']);
        setData(JSON.stringify({ results: otxFormat }));

        // === POLL UNTIL ENGINE IS READY ===
        const checkReady = setInterval(() => {
          try {
            const getGlobal = mod.cwrap('getGlobalGraphJSON', 'string', []);
            const json = getGlobal();
            if (json && json.includes('nodes') && json.length > 50) {
              const graphObj = JSON.parse(json);
              setGraphData(graphObj);
              setTopThreats(JSON.parse(mod.cwrap('getTopKThreats', 'string', ['number'])(5)));
              setLoading(false);
              setIsEngineReady(true); // ENGINE READY
              toast.success(`Loaded ${graphObj.nodes.length} IoCs`);
              clearInterval(checkReady);
            }
          } catch (e) { /* wait */ }
        }, 500);

        return () => clearInterval(checkReady);
      } catch (err) {
        console.error("Init failed:", err);
        toast.error("Failed to load mock data");
        setLoading(false);
      }
    };
    initApp();
  }, []);

  // === CLOSE PREFIX DROPDOWN ON OUTSIDE CLICK ===
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (prefixRef.current && !prefixRef.current.contains(e.target)) {
        setPrefixMatches([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // === PREFIX SEARCH HANDLER ===
  const handlePrefixChange = (e) => {
    const val = e.target.value;
    setSelectedIndex(-1); // RESET ON TYPE
    if (val.length > 2 && isEngineReady) {
      const search = module.cwrap('searchPrefix', 'string', ['string']);
      const res = search(val);
      try {
        setPrefixMatches(JSON.parse(res));
      } catch {
        setPrefixMatches([]);
      }
    } else {
      setPrefixMatches([]);
    }
  };

  // === PREFIX KEYDOWN ===
  const handlePrefixKeyDown = (e) => {
    if (!prefixMatches.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % prefixMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + prefixMatches.length) % prefixMatches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = prefixMatches[selectedIndex];
      const searchTerm = selected || e.target.value.trim();
      if (searchTerm) {
        if (prefixInputRef.current) prefixInputRef.current.value = searchTerm;
        setSearchValue(searchTerm);
        handleSearch(searchTerm);
        setPrefixMatches([]);
        setSelectedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setPrefixMatches([]);
      setSelectedIndex(-1);
    }
  };

  const handleSearch = (iocValue = searchValue) => {
    const value = (iocValue || '').toString().trim();
    if (!module || !isEngineReady || !value) return;

    const search = module.cwrap('searchIoC', 'string', ['string']);
    const result = search(value);

    // === CASE 1: VALID RESULT WITH data.ioc ===
    if (result && result !== '{}' && result !== 'null') {
      let data;
      try {
        data = JSON.parse(result);
      } catch (e) {
        console.error("JSON parse error:", e);
        goToNotFound();
        return;
      }

      if (data.ioc) {
        setIoc(data);
        setGraphMode('cluster');
        setSearchValue(value);

        if (prefixInputRef.current) {
          prefixInputRef.current.value = value;
        }

        const getCluster = module.cwrap('getClusterGraphJSON', 'string', ['string']);
        const clusterJSON = getCluster(value);
        const clusterDataRaw = JSON.parse(clusterJSON);
        const clusterData = JSON.parse(JSON.stringify(clusterDataRaw)); // Deep clone
        setGraphData(clusterData);
        setGraphMode('cluster');
        setGraphKey(prev => prev + 1); // This triggers full remount
        const node = clusterData.nodes.find(n => n.id === value);
        if (node) setSelectedNode(node);

        // TOP THREATS
        const getTopByType = module.cwrap('getTopThreatsByType', 'string', ['string', 'number']);
        let topList = [];
        if (getTopByType) {
          try {
            const topJSON = getTopByType(data.type, 5);
            topList = JSON.parse(topJSON);
          } catch (e) { }
        }
        if (topList.length === 0) {
          topList = clusterData.nodes
            .filter(n => n.type === data.type)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(n => ({ ioc: n.id, type: n.type, score: n.score }));
        }
        setTopThreats(topList);

        setRecentSearches(prev => [value, ...prev.filter(s => s !== value)].slice(0, 5));
        setPrefixMatches([]);

        toast.success(`Found: ${value}`);
        return;
      }
    }

    // === CASE 2: NOT FOUND → RESET EVERYTHING ===
    goToNotFound();
  };

  // === HELPER: RESET TO NOT FOUND STATE ===
  const goToNotFound = () => {
    setIoc(null);
    setGraphMode('global');
    setSelectedNode(null);
    setPathHighlight([]);
    setPrefixMatches([]);

    // RESTORE GLOBAL GRAPH
    const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
    const globalData = JSON.parse(getGlobal());
    setGraphData(JSON.parse(getGlobal()));
    setGraphKey(prev => prev + 1);

    // RESTORE GLOBAL TOP THREATS
    setTopThreats(JSON.parse(module.cwrap('getTopKThreats', 'string', ['number'])(5)));

    // FORCE REMOUNT
    setGraphKey(prev => prev + 1);

    toast.error(`IoC "${searchValue}" not found`);
  };


  const handleNodeClick = (node) => {
    setSearchValue(node.id);
    setSelectedNode(node);
    handleSearch(node.id);
  };

  const resetToGlobal = () => {
    if (!isEngineReady) return;
    setSearchValue('');
    setIoc(null);
    setGraphMode('global');
    setSelectedNode(null);
    setPathHighlight([]);
    setPrefixMatches([]);
    const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
    setGraphData(JSON.parse(getGlobal()));
    setGraphKey(prev => prev + 1);
    setTopThreats(JSON.parse(module.cwrap('getTopKThreats', 'string', ['number'])(5)));
  };

  const findPath = (fromNode) => {
    if (!isEngineReady || !searchValue) return;
    const getPath = module.cwrap('getShortestPath', 'string', ['string', 'string']);
    const pathJSON = getPath(fromNode.id, searchValue);
    if (pathJSON && pathJSON !== '[]') {
      setPathHighlight(JSON.parse(pathJSON));
      toast.success(`Path found!`);
    } else {
      toast.error('No path found');
    }
  };

  const clearCache = () => {
    setRecentSearches([]);
    setTopThreats([]);
    setIoc(null);
    setGraphMode('global');
    setSelectedNode(null);
    setPathHighlight([]);
    setPrefixMatches([]);
    if (isEngineReady) {
      const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
      setGraphData(JSON.parse(getGlobal()));
      setTopThreats(JSON.parse(module.cwrap('getTopKThreats', 'string', ['number'])(5)));
    }
    toast.success('Cache cleared!');
  };

  const openPathFinder = () => {
    setShowPathModal(true);
    setPathSrc('');
    setPathDst('');
  };

  const runPathFinder = () => {
    if (!pathSrc || !pathDst || !isEngineReady) return;
    const getPath = module.cwrap('getShortestPath', 'string', ['string', 'string']);
    const pathJSON = getPath(pathSrc, pathDst);
    if (pathJSON && pathJSON !== '[]') {
      setPathHighlight(JSON.parse(pathJSON));
      toast.success(`Path: ${pathJSON}`);
    } else {
      toast.error('No path found');
    }
    setShowPathModal(false);
  };

  const exportReport = async (format) => {
    if (!isEngineReady) return toast.error("Engine not ready");
    if (!module) return toast.error("Engine not ready");
    const report = {
      timestamp: new Date().toLocaleString(),
      searchQuery: searchValue || "Global View",
      foundIoC: ioc,
      topThreats: topThreats,
      graphMode: graphMode,
      totalNodes: graphData?.nodes?.length || 0,
      path: pathHighlight
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cyber-report-${Date.now()}.json`;
      a.click();
      toast.success('Report exported as JSON');
    } else if (format === 'pdf') {
      const graphEl = document.querySelector('.flex-1');
      if (!graphEl) return toast.error('Graph not ready');
      const canvas = await html2canvas(graphEl, { backgroundColor: '#0e0f11', scale: 2 });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(6, 182, 212);
      pdf.text("Cyber Threat Report", 15, 25);

      pdf.setFontSize(12);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Generated: ${report.timestamp}`, 15, 35);
      pdf.text(`Query: ${report.searchQuery}`, 15, 43);
      pdf.text(`Total IoCs: ${report.totalNodes}`, 15, 51);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.text("Top 5 Threats", 15, 65);
      report.topThreats.forEach((t, i) => {
        pdf.setFontSize(11);
        pdf.text(`${i + 1}. ${t.ioc} (${t.type}) - ${t.score}/100`, 20, 73 + i * 7);
      });

      pdf.addImage(img, 'PNG', 15, 100, width - 30, (width - 30) * 0.6);
      pdf.save(`cyber-report-${Date.now()}.pdf`);
      toast.success('Report exported as PDF');
    }
  };

  const handleTypeSearch = (type) => {
    if (!isEngineReady) return;

    const normalized = type.toLowerCase();
    const validTypes = ['ip', 'domain', 'hash', 'campaign'];
    if (!validTypes.includes(normalized)) {
      toast.error('Invalid type. Use: IP, Domain, Hash, Campaign');
      return;
    }

    const getTop = module.cwrap('getTopThreatsByType', 'string', ['string', 'number']);
    const topJSON = getTop(normalized === 'campaign' ? 'threat' : normalized, 10); // top 10
    const topThreats = JSON.parse(topJSON);

    // Switch to "Type View"
    setGraphMode('type');
    setSelectedNode({ id: `Top ${normalized.toUpperCase()} Threats`, type: normalized });
    setTopThreats(topThreats);
    setIoc(null);

    // Generate type-specific graph
    const nodes = topThreats.map(t => t.ioc);
    const graph = { nodes: [], links: [] };
    nodes.forEach(ioc => {
      const details = JSON.parse(module.cwrap('searchIoC', 'string', ['string'])(ioc));
      graph.nodes.push({
        id: ioc,
        label: ioc,
        type: details.type || normalized,
        score: details.score || 0
      });
      // Add edges from relatedIoCs
      if (details.relatedIoCs) {
        details.relatedIoCs.forEach(rel => {
          if (nodes.includes(rel)) {
            graph.links.push({ source: ioc, target: rel });
          }
        });
      }
    });

    setGraphData(graph);
    setGraphKey(prev => prev + 1);
    toast.success(`Showing top ${normalized.toUpperCase()} threats`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0f11] flex items-center justify-center">
        <motion.div
          className="text-cyan-400 text-3xl font-bold"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          Initializing Cyber Engine...
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="w-screen min-h-screen bg-gradient-to-b from-[#0e0f11] to-[#18191c] text-gray-200 flex flex-col overflow-x-hidden">
        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-cyan-900/30 px-6 py-4 backdrop-blur-sm bg-white/5"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.1 }} className="w-16 h-16 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/30">
                <img src="/ICTA-logo.png" alt="ICTA Logo" className="w-full h-full object-contain" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">Integrated Cyber Threat Analyzer</h1>
                <p className="text-gray-400 text-sm">Powered by Real-Time C++ Engine & WASM</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={resetToGlobal}
                className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-green-700/20 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/30 whitespace-nowrap"
              >
                Global View
              </motion.button>

              {/* MAIN SEARCH BAR */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search IP, Domain, Hash, or Campaign..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-80 bg-white/10 text-gray-100 px-4 py-2.5 rounded-lg pr-11 border border-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-[#0e0f11]/50 transition-all placeholder-gray-500 text-base"
                />
                <Search
                  onClick={() => handleSearch()}
                  className="absolute right-3 top-3 text-cyan-400 hover:text-pink-400 cursor-pointer transition-colors"
                  size={20}
                />
              </div>

              {/* PREFIX SEARCH BAR */}
              <div className="relative" ref={prefixRef}>
                <input
                  ref={prefixInputRef}
                  type="text"
                  placeholder="Prefix: APT29, DDoS, 192..."
                  onChange={handlePrefixChange}
                  onKeyDown={(e) => {
                    if (!prefixMatches.length) return;

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedIndex(prev => (prev + 1) % prefixMatches.length);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedIndex(prev => (prev - 1 + prefixMatches.length) % prefixMatches.length);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const selected = prefixMatches[selectedIndex];
                      const searchTerm = selected || e.target.value.trim();
                      if (searchTerm) {
                        if (prefixInputRef.current) prefixInputRef.current.value = searchTerm;
                        setSearchValue(searchTerm);
                        handleSearch(searchTerm);
                        setPrefixMatches([]);
                        setSelectedIndex(-1);
                      }
                    } else if (e.key === 'Escape') {
                      setPrefixMatches([]);
                      setSelectedIndex(-1);
                    }
                  }}
                  className="w-80 bg-white/10 text-gray-100 px-4 py-2.5 rounded-lg pr-11 border border-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-[#0e0f11]/50 transition-all placeholder-gray-500 text-base"
                />

                {/* SEARCH ICON */}
                <Search
                  onClick={() => {
                    const val = prefixInputRef.current?.value.trim();
                    if (val) {
                      if (prefixInputRef.current) prefixInputRef.current.value = val;
                      setSearchValue(val);
                      handleSearch(val);
                      setPrefixMatches([]);
                      setSelectedIndex(-1);
                    }
                  }}
                  className="absolute right-3 top-3 text-purple-400 hover:text-pink-400 cursor-pointer transition-colors opacity-70 hover:opacity-100"
                  size={20}
                />

                {/* DROPDOWN */}
                {prefixMatches.length > 0 && createPortal(
                  <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute mt-1 w-full rounded-xl border border-cyan-500/30 bg-[#0f0f11]/95 backdrop-blur-md shadow-2xl text-gray-200 z-[200] max-h-64 overflow-y-auto"
                    style={{
                      top: prefixRef.current?.getBoundingClientRect()?.bottom + window.scrollY,
                      left: prefixRef.current?.getBoundingClientRect()?.left,
                      width: prefixRef.current?.offsetWidth || 320,
                    }}
                  >
                    {prefixMatches.map((m, i) => (
                      <li
                        key={i}
                        className={`px-4 py-3 cursor-pointer text-sm border-b border-white/5 last:border-0 flex items-center justify-between transition-all ${i === selectedIndex ? 'bg-cyan-500/30 text-cyan-300' : 'hover:bg-cyan-500/20'
                          }`}
                        onClick={() => {
                          if (prefixInputRef.current) prefixInputRef.current.value = m;
                          setSearchValue(m);
                          handleSearch(m);
                          setPrefixMatches([]);
                          setSelectedIndex(-1);
                        }}
                      >
                        <span className="font-mono">{m}</span>
                        <span className="text-xs text-cyan-400">Click or Enter</span>
                      </li>
                    ))}
                  </motion.ul>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </motion.header>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex gap-6 p-6">
          {/* LEFT CARD */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="w-64 bg-[#141518]/70 rounded-2xl p-6 backdrop-blur-md border border-white/10 space-y-6 shadow-lg shadow-black/50">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-pink-500 rounded-full mx-auto mb-3 shadow-md shadow-cyan-500/30"></div>
              <h3 className="text-white font-bold text-lg">Cyber Threat Team</h3>
              <p className="text-cyan-400 text-sm">Lead: Syeda Aliza Ayaz</p>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <p className="flex items-center gap-2 hover:text-cyan-400 transition-colors">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Arooj Zahra
              </p>
              <p className="flex items-center gap-2 hover:text-pink-400 transition-colors">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span> Syeda Amna Zahid
              </p>
            </div>
          </motion.div>

          {/* CENTER GRAPH */}
          <motion.div className="flex-1 min-w-0">
            <ThreatGraph
              key={graphKey}
              graphKey={graphKey}
              graphData={graphData}
              mode={graphMode}
              onNodeClick={handleNodeClick}
              onPathFind={findPath}
              pathHighlight={pathHighlight}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
            />
          </motion.div>

          {/* RIGHT PANEL */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="w-80 space-y-6 flex-shrink-0">
            {ioc ? (
              <motion.div key="found" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }} className="bg-[#141518]/70 rounded-2xl p-6 backdrop-blur-lg border border-white/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <svg className="w-28 h-28 transform -rotate-90">
                      <circle cx="56" cy="56" r="50" stroke="#2d2d2f" strokeWidth="8" fill="none" />
                      <circle cx="56" cy="56" r="50" stroke="#06b6d4" strokeWidth="8" fill="none" strokeDasharray={`${(ioc.score / 100) * 314} 314`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{ioc.score}/100</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">IoC Type: {ioc.type}</h3>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-400">
                  <p className="text-cyan-400 font-semibold">IoC: {ioc.ioc}</p>
                  {console.log("IOC DETAILS →", ioc)}
                  <p>Campaign: "{ioc.threat}"</p>
                  <p>Related IoCs: {ioc.relatedIoCs.slice(0, 3).join(', ')}{ioc.relatedIoCs.length > 3 ? '...' : ''}</p>
                  <p>Confidence: {ioc.confidence_level}%</p>
                  <p>Cluster Size: {ioc.relatedIoCs.length + 1} threats</p>
                </div>
              </motion.div>
            ) : searchValue && !loading && (
              <motion.div key="not-found" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-red-900/20 to-pink-900/20 rounded-2xl p-6 backdrop-blur-lg border border-red-500/30 flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-white font-bold text-lg">IoC Not Found</h3>
                <p className="text-red-300 text-sm max-w-xs">
                  <span className="font-mono bg-red-900/30 px-2 py-1 rounded">{searchValue}</span> is not in our threat database.
                </p>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.01 }} className="bg-[#141518]/70 rounded-2xl p-6 backdrop-blur-lg border border-white/10">
              <h3 className="text-white font-bold text-lg mb-4">Recent Searches</h3>
              {recentSearches.length > 0 ? (
                <ol className="space-y-2 text-sm text-gray-400">
                  {recentSearches.map((s, i) => (
                    <li key={i} className="cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => { setSearchValue(s); handleSearch(s); }}>
                      {i + 1}. {s}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-500 text-sm">No recent searches yet.</p>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* FOOTER */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="border-t border-cyan-900/30 bg-[#141518]/70 backdrop-blur-md px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white font-bold text-xl mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-gradient-to-b from-cyan-400 to-pink-500 rounded-full"></span>
              Top 5 {graphMode === 'global' ? 'Global' : ioc?.type + ' Type'} Threats
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topThreats.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-[#1a1b1e]/80 to-[#141518]/80 p-5 rounded-2xl border border-cyan-500/20 backdrop-blur-sm shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-white font-semibold text-lg">{t.ioc}</h4>
                      <p className="text-cyan-400 text-xs">{t.type}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${t.score > 80 ? 'text-red-500' : t.score > 60 ? 'text-orange-500' : 'text-yellow-500'}`}>
                        {t.score}
                      </span>
                      <span className="text-gray-500 text-sm">/100</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mt-3">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${t.score}%` }} className={`h-full rounded-full ${t.score > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' : t.score > 60 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-yellow-500 to-yellow-600'}`} />
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 flex justify-between items-center">
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => exportReport('json')} className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30">
                  <Download size={18} /> JSON
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => exportReport('pdf')} className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30">
                  <Download size={18} /> PDF
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={clearCache} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/30">
                  <RefreshCw size={18} /> Clear Cache
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={openPathFinder} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30">
                  <GitBranch size={18} /> Path Finder
                </motion.button>
              </div>
              <p className="text-gray-500 text-sm">© 2025 Cyber Team | <a href="#" className="underline text-cyan-400 hover:text-pink-400">GitHub</a></p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* PATH FINDER MODAL */}
      {showPathModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1a1b1e] p-6 rounded-2xl border border-cyan-500/30 w-96">
            <h3 className="text-white font-bold text-lg mb-4">Find Shortest Path</h3>
            <input
              type="text"
              placeholder="Source IoC"
              value={pathSrc}
              onChange={(e) => setPathSrc(e.target.value)}
              className="w-full mb-3 px-4 py-2 bg-white/10 border border-cyan-500/20 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="text"
              placeholder="Destination IoC"
              value={pathDst}
              onChange={(e) => setPathDst(e.target.value)}
              className="w-full mb-4 px-4 py-2 bg-white/10 border border-cyan-500/20 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPathModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={runPathFinder} className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30">Find Path</button>
            </div>
          </motion.div>
        </div>
      )}

      <Toaster position="bottom-right" />
    </>
  );
}