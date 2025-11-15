// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, RefreshCw, GitBranch, ChevronDown } from 'lucide-react';
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
  const [isEngineReady, setIsEngineReady] = useState(false);
  const prefixRef = useRef(null);
  const prefixInputRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const typeFilterRef = useRef(null);
  const [isTypeLoading, setIsTypeLoading] = useState(false);
  const [availableTypes, setAvailableTypes] = useState([]);

  useEffect(() => {
    console.log('selectedType updated:', selectedType);
    console.log('availableTypes updated:', availableTypes);
  }, [selectedType, availableTypes]);

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

        // NEW: Extract unique types from mockData and capitalize "IP" fully, others as title case
        const uniqueTypes = [...new Set(mockData.map(item => {
          const type = item.type.toLowerCase();
          return type === 'ip' ? 'IP' : type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        }))].sort();
        setAvailableTypes(uniqueTypes);

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
              // Assign colors during initial load
              graphObj.nodes = graphObj.nodes.map(node => ({
                ...node,
                type: node.type.toLowerCase() === 'ip' ? 'IP' : node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase(),
                color: node.type.toLowerCase() === 'ip' ? '#06b6d4' : node.type.toLowerCase() === 'domain' ? '#8b5cf6' : node.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
              }));
              setGraphData(graphObj);
              setTopThreats(JSON.parse(mod.cwrap('getTopKThreats', 'string', ['number'])(5)));
              setLoading(false);
              setIsEngineReady(true);
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (prefixRef.current && !prefixRef.current.contains(e.target)) {
        setPrefixMatches([]);
      }
      if (typeFilterRef.current && !typeFilterRef.current.contains(e.target)) {
        console.log('Clicked outside, closing type dropdown');
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTypeKeyDown = (e) => {
    if (isTypeLoading) return;

    const types = ['', ...availableTypes];
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (showTypeDropdown) {
        const type = types[selectedTypeIndex];
        console.log('Enter selected type:', type);
        setSelectedType(type || 'All Types');
        setShowTypeDropdown(false);
        if (type) handleTypeChange(type);
        else resetToGlobal();
      } else {
        setShowTypeDropdown(true);
      }
    } else if (showTypeDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedTypeIndex((prev) => (prev + 1) % types.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedTypeIndex((prev) => (prev - 1 + types.length) % types.length);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowTypeDropdown(false);
        setSelectedTypeIndex(0);
      }
    }
  };

  // const handleTypeChange = (type) => {
  //   if (!type || !module || !isEngineReady) {
  //     toast.error('Engine not ready or invalid type');
  //     setSelectedType(type || 'All Types');
  //     return;
  //   }

  //   setIsTypeLoading(true);
  //   try {
  //     console.log('handleTypeChange called with type:', type);
  //     let graph = null;
  //     let topThreats = [];

  //     const hasGetTypeGraphJSON = module['_getTypeGraphJSON'] || (module.cwrap && module.cwrap('getTypeGraphJSON', 'string', ['string'], { async: true }));
  //     const hasGetTopThreatsByType = module['_getTopThreatsByType'] || (module.cwrap && module.cwrap('getTopThreatsByType', 'string', ['string', 'number'], { async: true }));

  //     if (hasGetTypeGraphJSON && hasGetTopThreatsByType) {
  //       const getTypeGraphJSON = module.cwrap('getTypeGraphJSON', 'string', ['string']);
  //       const getTopThreatsByType = module.cwrap('getTopThreatsByType', 'string', ['string', 'number']);

  //       const graphJSON = getTypeGraphJSON(type);
  //       console.log('graphJSON:', graphJSON);
  //       if (!graphJSON || graphJSON === '{}') throw new Error('No graph data returned');
  //       graph = JSON.parse(graphJSON);
  //       // Assign colors to nodes
  //       graph.nodes = graph.nodes.map(node => ({
  //         ...node,
  //         type: node.type.toLowerCase() === 'ip' ? 'IP' : node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase(),
  //         color: node.type.toLowerCase() === 'ip' ? '#06b6d4' : node.type.toLowerCase() === 'domain' ? '#8b5cf6' : node.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
  //       }));

  //       const topJSON = getTopThreatsByType(type, 5);
  //       console.log('topJSON:', topJSON);
  //       if (topJSON && topJSON !== '[]') {
  //         topThreats = JSON.parse(topJSON).map(t => ({
  //           ...t,
  //           type: t.type.toLowerCase() === 'ip' ? 'IP' : t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()
  //         }));
  //       }
  //     } else {
  //       console.warn(`WASM function${!hasGetTypeGraphJSON ? ' getTypeGraphJSON' : ''}${!hasGetTopThreatsByType ? ' getTopThreatsByType' : ''} missing, using fallback`);
  //       const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
  //       const globalGraph = JSON.parse(getGlobal());
  //       graph = {
  //         nodes: globalGraph.nodes
  //           .filter((n) => n.type.toLowerCase() === type.toLowerCase())
  //           .map((n) => ({
  //             ...n,
  //             type: n.type.toLowerCase() === 'ip' ? 'IP' : n.type.charAt(0).toUpperCase() + n.type.slice(1).toLowerCase(),
  //             color: n.type.toLowerCase() === 'ip' ? '#06b6d4' : n.type.toLowerCase() === 'domain' ? '#8b5cf6' : n.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
  //           })),
  //         edges: globalGraph.edges.filter((e) =>
  //           globalGraph.nodes.some((n) => n.id === e.source && n.type.toLowerCase() === type.toLowerCase()) &&
  //           globalGraph.nodes.some((n) => n.id === e.target && n.type.toLowerCase() === type.toLowerCase())
  //         ),
  //       };
  //       topThreats = graph.nodes
  //         .sort((a, b) => (b.score || 0) - (a.score || 0))
  //         .slice(0, 5)
  //         .map((n) => ({ ioc: n.id, type: n.type, score: n.score || 0 }));
  //     }

  //     if (!graph.nodes.length) {
  //       throw new Error(`No ${type} nodes found`);
  //     }

  //     // NEW: Log node types and colors for debugging
  //     console.log('Graph nodes types and colors:', graph.nodes.map(n => ({ id: n.id, type: n.type, color: n.color })));

  //     setGraphMode('type');
  //     setGraphData(graph);
  //     setTopThreats(topThreats);
  //     setSelectedNode({
  //       id: type.toUpperCase(),
  //       type,
  //       threat: `${type} Overview`,
  //       score: Math.round(
  //         graph.nodes.reduce((a, b) => a + (b.score || 0), 0) / (graph.nodes.length || 1)
  //       ),
  //       relatedIoCs: graph.nodes.map((n) => n.id).slice(0, 5),
  //     });

  //     toast.success(`${type} threats visualized successfully!`);
  //   } catch (error) {
  //     console.error('Type filter error:', error);
  //     toast.error(`Failed to load ${type} graph, showing filtered data`);
  //     const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
  //     const globalGraph = JSON.parse(getGlobal());
  //     graph = {
  //       nodes: globalGraph.nodes
  //         .filter((n) => n.type.toLowerCase() === type.toLowerCase())
  //         .map((n) => ({
  //           ...n,
  //           type: n.type.toLowerCase() === 'ip' ? 'IP' : n.type.charAt(0).toUpperCase() + n.type.slice(1).toLowerCase(),
  //           color: n.type.toLowerCase() === 'ip' ? '#06b6d4' : n.type.toLowerCase() === 'domain' ? '#8b5cf6' : n.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
  //         })),
  //       edges: globalGraph.edges.filter((e) =>
  //         globalGraph.nodes.some((n) => n.id === e.source && n.type.toLowerCase() === type.toLowerCase()) &&
  //         globalGraph.nodes.some((n) => n.id === e.target && n.type.toLowerCase() === type.toLowerCase())
  //       ),
  //     };
  //     topThreats = graph.nodes
  //       .sort((a, b) => (b.score || 0) - (a.score || 0))
  //       .slice(0, 5)
  //       .map((n) => ({ ioc: n.id, type: n.type, score: n.score || 0 }));

  //     // NEW: Log node types and colors for debugging
  //     console.log('Fallback graph nodes types and colors:', graph.nodes.map(n => ({ id: n.id, type: n.type, color: n.color })));

  //     setGraphMode('type');
  //     setGraphData(graph);
  //     setTopThreats(topThreats);
  //     setSelectedNode({
  //       id: type.toUpperCase(),
  //       type,
  //       threat: `${type} Overview`,
  //       score: Math.round(
  //         graph.nodes.reduce((a, b) => a + (b.score || 0), 0) / (graph.nodes.length || 1)
  //       ),
  //       relatedIoCs: graph.nodes.map((n) => n.id).slice(0, 5),
  //     });
  //   } finally {
  //     setIsTypeLoading(false);
  //   }
  // };

  // Inside src/App.jsx, update handleTypeChange
  const handleTypeChange = (type) => {
    if (!type || !module || !isEngineReady) {
      toast.error('Engine not ready or invalid type');
      setSelectedType(type || 'All Types');
      return;
    }

    setIsTypeLoading(true);
    try {
      console.log('handleTypeChange called with type:', type);
      let graph = null;
      let topThreats = [];

      const hasGetTypeGraphJSON = module['_getTypeGraphJSON'] || (module.cwrap && module.cwrap('getTypeGraphJSON', 'string', ['string'], { async: true }));
      const hasGetTopThreatsByType = module['_getTopThreatsByType'] || (module.cwrap && module.cwrap('getTopThreatsByType', 'string', ['string', 'number'], { async: true }));

      if (hasGetTypeGraphJSON && hasGetTopThreatsByType) {
        const getTypeGraphJSON = module.cwrap('getTypeGraphJSON', 'string', ['string']);
        const getTopThreatsByType = module.cwrap('getTopThreatsByType', 'string', ['string', 'number']);

        const graphJSON = getTypeGraphJSON(type.toLowerCase()); // Normalize to lowercase
        console.log('graphJSON:', graphJSON);
        if (!graphJSON || graphJSON === '{}') throw new Error('No graph data returned');
        graph = JSON.parse(graphJSON);
        // Assign colors to nodes
        graph.nodes = graph.nodes.map(node => ({
          ...node,
          type: node.type.toLowerCase() === 'ip' ? 'IP' : node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase(),
          color: node.type.toLowerCase() === 'ip' ? '#06b6d4' : node.type.toLowerCase() === 'domain' ? '#8b5cf6' : node.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
        }));

        const topJSON = getTopThreatsByType(type.toLowerCase(), 5);
        console.log('topJSON:', topJSON);
        if (topJSON && topJSON !== '[]') {
          topThreats = JSON.parse(topJSON).map(t => ({
            ...t,
            type: t.type.toLowerCase() === 'ip' ? 'IP' : t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()
          }));
        }
      } else {
        console.warn(`WASM function${!hasGetTypeGraphJSON ? ' getTypeGraphJSON' : ''}${!hasGetTopThreatsByType ? ' getTopThreatsByType' : ''} missing, using fallback`);
        const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
        const globalGraph = JSON.parse(getGlobal());
        graph = {
          nodes: globalGraph.nodes
            .filter((n) => n.type.toLowerCase() === type.toLowerCase())
            .map((n) => ({
              ...n,
              type: n.type.toLowerCase() === 'ip' ? 'IP' : n.type.charAt(0).toUpperCase() + n.type.slice(1).toLowerCase(),
              color: n.type.toLowerCase() === 'ip' ? '#06b6d4' : n.type.toLowerCase() === 'domain' ? '#8b5cf6' : n.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
            })),
          links: globalGraph.links.filter((l) =>
            globalGraph.nodes.some((n) => n.id === l.source && n.type.toLowerCase() === type.toLowerCase()) &&
            globalGraph.nodes.some((n) => n.id === l.target && n.type.toLowerCase() === type.toLowerCase())
          ),
        };
        topThreats = graph.nodes
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 5)
          .map((n) => ({ ioc: n.id, type: n.type, score: n.score || 0 }));
      }

      if (!graph.nodes.length) {
        throw new Error(`No ${type} nodes found`);
      }

      console.log('Graph nodes types and colors:', graph.nodes.map(n => ({ id: n.id, type: n.type, color: n.color })));

      setGraphMode('type');
      setGraphData(graph);
      setTopThreats(topThreats);
      setSelectedNode({
        id: type.toUpperCase(),
        type,
        threat: `${type} Overview`,
        score: Math.round(
          graph.nodes.reduce((a, b) => a + (b.score || 0), 0) / (graph.nodes.length || 1)
        ),
        relatedIoCs: graph.nodes.map((n) => n.id).slice(0, 5),
      });

      toast.success(`${type} threats visualized successfully!`);
    } catch (error) {
      console.error('Type filter error:', error);
      toast.error(`Failed to load ${type} graph, showing filtered data`);
      const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
      const globalGraph = JSON.parse(getGlobal());
      graph = {
        nodes: globalGraph.nodes
          .filter((n) => n.type.toLowerCase() === type.toLowerCase())
          .map((n) => ({
            ...n,
            type: n.type.toLowerCase() === 'ip' ? 'IP' : n.type.charAt(0).toUpperCase() + n.type.slice(1).toLowerCase(),
            color: n.type.toLowerCase() === 'ip' ? '#06b6d4' : n.type.toLowerCase() === 'domain' ? '#8b5cf6' : n.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
          })),
        links: globalGraph.links.filter((l) =>
          globalGraph.nodes.some((n) => n.id === l.source && n.type.toLowerCase() === type.toLowerCase()) &&
          globalGraph.nodes.some((n) => n.id === l.target && n.type.toLowerCase() === type.toLowerCase())
        ),
      };
      topThreats = graph.nodes
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5)
        .map((n) => ({ ioc: n.id, type: n.type, score: n.score || 0 }));

      console.log('Fallback graph nodes types and colors:', graph.nodes.map(n => ({ id: n.id, type: n.type, color: n.color })));

      setGraphMode('type');
      setGraphData(graph);
      setTopThreats(topThreats);
      setSelectedNode({
        id: type.toUpperCase(),
        type,
        threat: `${type} Overview`,
        score: Math.round(
          graph.nodes.reduce((a, b) => a + (b.score || 0), 0) / (graph.nodes.length || 1)
        ),
        relatedIoCs: graph.nodes.map((n) => n.id).slice(0, 5),
      });
    } finally {
      setIsTypeLoading(false);
    }
  };

  const resetToGlobal = () => {
    if (!isEngineReady) return;
    setSearchValue('');
    setIoc(null);
    setGraphMode('global');
    setSelectedNode(null);
    setPathHighlight([]);
    setPrefixMatches([]);
    setSelectedType('All Types');
    setSelectedTypeIndex(0);
    const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
    const globalGraph = JSON.parse(getGlobal());
    // Ensure colors are assigned consistently
    globalGraph.nodes = globalGraph.nodes.map(node => ({
      ...node,
      type: node.type.toLowerCase() === 'ip' ? 'IP' : node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase(),
      color: node.type.toLowerCase() === 'ip' ? '#06b6d4' : node.type.toLowerCase() === 'domain' ? '#8b5cf6' : node.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
    }));
    // NEW: Log node types and colors for debugging
    console.log('Global graph nodes types and colors:', globalGraph.nodes.map(n => ({ id: n.id, type: n.type, color: n.color })));
    setGraphData(globalGraph);
    setGraphKey(prev => prev + 1);
    setTopThreats(JSON.parse(module.cwrap('getTopKThreats', 'string', ['number'])(5)).map(t => ({
      ...t,
      type: t.type.toLowerCase() === 'ip' ? 'IP' : t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()
    })));
  };

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
  // const handlePrefixKeyDown = (e) => {
  //   if (!prefixMatches.length) return;

  //   if (e.key === 'ArrowDown') {
  //     e.preventDefault();
  //     setSelectedIndex(prev => (prev + 1) % prefixMatches.length);
  //   } else if (e.key === 'ArrowUp') {
  //     e.preventDefault();
  //     setSelectedIndex(prev => (prev - 1 + prefixMatches.length) % prefixMatches.length);
  //   } else if (e.key === 'Enter') {
  //     e.preventDefault();
  //     const selected = prefixMatches[selectedIndex];
  //     const searchTerm = selected || e.target.value.trim();
  //     if (searchTerm) {
  //       if (prefixInputRef.current) prefixInputRef.current.value = searchTerm;
  //       setSearchValue(searchTerm);
  //       handleSearch(searchTerm);
  //       setPrefixMatches([]);
  //       setSelectedIndex(-1);
  //     }
  //   } else if (e.key === 'Escape') {
  //     setPrefixMatches([]);
  //     setSelectedIndex(-1);
  //   }
  // };

  const handlePrefixKeyDown = (e) => {
    if (!prefixMatches.length && e.key !== 'Enter') return; // Allow Enter even without matches

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
        if (prefixInputRef.current) {
          prefixInputRef.current.value = searchTerm;
          prefixInputRef.current.focus(); // Ensure focus remains
        }
        setSearchValue(searchTerm);
        try {
          handleSearch(searchTerm);
        } catch (error) {
          console.error('Search error:', error);
          toast.error(error.message); // Show error toast
          goToNotFound();
        }
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
        // Capitalize the type in ioc data (IP fully, others title case)
        data.type = data.type.toLowerCase() === 'ip' ? 'IP' : data.type.charAt(0).toUpperCase() + data.type.slice(1).toLowerCase();
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
        // Assign colors to cluster nodes
        clusterData.nodes = clusterData.nodes.map(node => ({
          ...node,
          type: node.type.toLowerCase() === 'ip' ? 'IP' : node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase(),
          color: node.type.toLowerCase() === 'ip' ? '#06b6d4' : node.type.toLowerCase() === 'domain' ? '#8b5cf6' : node.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
        }));
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
            topList = JSON.parse(topJSON).map(t => ({
              ...t,
              type: t.type.toLowerCase() === 'ip' ? 'IP' : t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()
            }));
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

    // === CASE 2: NOT FOUND → EXPLICIT ERROR ===
    throw new Error(`IoC "${value}" not found in the database`);
  };
  // === HELPER: RESET TO NOT FOUND STATE ===
  // const goToNotFound = () => {
  //   setIoc(null);
  //   setGraphMode('global');
  //   setSelectedNode(null);
  //   setPathHighlight([]);
  //   setPrefixMatches([]);

  //   // RESTORE GLOBAL GRAPH
  //   const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
  //   const globalData = JSON.parse(getGlobal());
  //   // Assign colors to global nodes
  //   globalData.nodes = globalData.nodes.map(node => ({
  //     ...node,
  //     type: node.type.toLowerCase() === 'ip' ? 'IP' : node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase(),
  //     color: node.type.toLowerCase() === 'ip' ? '#06b6d4' : node.type.toLowerCase() === 'domain' ? '#8b5cf6' : node.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
  //   }));
  //   setGraphData(globalData);
  //   setGraphKey(prev => prev + 1);

  //   // RESTORE GLOBAL TOP THREATS
  //   setTopThreats(JSON.parse(module.cwrap('getTopKThreats', 'string', ['number'])(5)).map(t => ({
  //     ...t,
  //     type: t.type.toLowerCase() === 'ip' ? 'IP' : t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()
  //   })));

  //   // FORCE REMOUNT
  //   setGraphKey(prev => prev + 1);

  //   toast.error(`IoC "${searchValue}" not found`);
  // };
  const goToNotFound = () => {
    setIoc(null);
    setGraphMode('global');
    setSelectedNode(null);
    setPathHighlight([]);
    setPrefixMatches([]);

    // RESTORE GLOBAL GRAPH
    const getGlobal = module.cwrap('getGlobalGraphJSON', 'string', []);
    const globalData = JSON.parse(getGlobal());
    // Assign colors to global nodes
    globalData.nodes = globalData.nodes.map(node => ({
      ...node,
      type: node.type.toLowerCase() === 'ip' ? 'IP' : node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase(),
      color: node.type.toLowerCase() === 'ip' ? '#06b6d4' : node.type.toLowerCase() === 'domain' ? '#8b5cf6' : node.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
    }));
    setGraphData(globalData);
    setGraphKey(prev => prev + 1);

    // RESTORE GLOBAL TOP THREATS
    setTopThreats(JSON.parse(module.cwrap('getTopKThreats', 'string', ['number'])(5)).map(t => ({
      ...t,
      type: t.type.toLowerCase() === 'ip' ? 'IP' : t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()
    })));

    // FORCE REMOUNT
    setGraphKey(prev => prev + 1);

    // Toast will be triggered by the catch block in handleSearch
  };
  const handleNodeClick = (node) => {
    setSearchValue(node.id);
    setSelectedNode(node);
    handleSearch(node.id);
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
      const globalData = JSON.parse(getGlobal());
      // Assign colors to global nodes
      globalData.nodes = globalData.nodes.map(node => ({
        ...node,
        type: node.type.toLowerCase() === 'ip' ? 'IP' : node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase(),
        color: node.type.toLowerCase() === 'ip' ? '#06b6d4' : node.type.toLowerCase() === 'domain' ? '#8b5cf6' : node.type.toLowerCase() === 'hash' ? '#ec4899' : '#94a3b8',
      }));
      setGraphData(globalData);
      setTopThreats(JSON.parse(module.cwrap('getTopKThreats', 'string', ['number'])(5)).map(t => ({
        ...t,
        type: t.type.toLowerCase() === 'ip' ? 'IP' : t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()
      })));
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
      topThreats: topThreats.map(t => ({
        ...t,
        type: t.type.toLowerCase() === 'ip' ? 'IP' : t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()
      })),
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
      const graphEl = document.querySelector('svg'); // Target the SVG directly
      if (!graphEl) return toast.error('Graph not ready');
      const canvas = await html2canvas(graphEl, { backgroundColor: null, scale: 2 }); // No background override
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

  // ... (keep the existing imports and state setup) ...

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
            <div className="flex items-center gap-8"> {/* Increased gap to shift logo right */}
              <motion.div whileHover={{ scale: 1.1 }} className="w-16 h-16 rounded-xl overflow-hidden">
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
                className="px-4 py-2 bg-gradient-to-r from-blue-900/20 to-blue-700/20 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 whitespace-nowrap"
                style={{ backgroundColor: '#0e1a43ff' }} // Explicit blue for Global View
              >
                Global View
              </motion.button>

              {/* Filter by Type Dropdown */}
              <div className="relative" ref={typeFilterRef}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileFocus={{ scale: 1.02, borderColor: 'rgba(236, 72, 153, 0.8)' }}
                  onClick={() => {
                    console.log('Dropdown clicked, toggling showTypeDropdown');
                    if (!isTypeLoading) setShowTypeDropdown(!showTypeDropdown);
                  }}
                  onKeyDown={handleTypeKeyDown}
                  tabIndex={0}
                  role="combobox"
                  aria-expanded={showTypeDropdown}
                  aria-label="Filter by threat type"
                  className={`w-48 bg-white/10 text-yellow-300 px-4 py-2.5 rounded-lg border border-yellow-500/20 hover:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all cursor-pointer flex items-center justify-between ${isTypeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: '#6a5607ff' }} // Explicit yellow for All Types
                >
                  <span className="text-sm font-medium">
                    {isTypeLoading ? 'Loading...' : selectedType}
                  </span>
                  <ChevronDown
                    className="text-yellow-400 hover:text-yellow-300 transition-colors opacity-70 hover:opacity-100"
                    size={20}
                  />
                </motion.div>

                {showTypeDropdown && createPortal(
                  <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute mt-1 w-full rounded-lg border border-yellow-500/30 bg-[#0f0f11]/95 backdrop-blur-md shadow-2xl text-gray-200 z-[1000] pointer-events-auto"
                    style={{
                      top: typeFilterRef.current?.getBoundingClientRect()?.bottom + window.scrollY,
                      left: typeFilterRef.current?.getBoundingClientRect()?.left,
                      width: typeFilterRef.current?.offsetWidth || 192,
                    }}
                  >
                    {['', ...availableTypes].map((type, i) => (
                      <li
                        key={i}
                        className={`px-4 py-3 cursor-pointer text-sm border-b border-white/5 last:border-0 flex items-center justify-between transition-all ${i === selectedTypeIndex ? 'bg-yellow-500/30 text-yellow-300' : 'hover:bg-yellow-500/20'}`}
                        onMouseEnter={() => setSelectedTypeIndex(i)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Mouse clicked type:', type || 'All Types');
                          setSelectedType(type || 'All Types');
                          setSelectedTypeIndex(i);
                          setShowTypeDropdown(false);
                          console.log('Calling handleTypeChange/resetToGlobal with type:', type);
                          if (type) handleTypeChange(type);
                          else resetToGlobal();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            console.log('Keydown selected type:', type || 'All Types');
                            setSelectedType(type || 'All Types');
                            setShowTypeDropdown(false);
                            setSelectedTypeIndex(i);
                            if (type) handleTypeChange(type);
                            else resetToGlobal();
                          }
                        }}
                        tabIndex={0}
                        role="option"
                        aria-selected={i === selectedTypeIndex}
                      >
                        <span className="font-mono">{type || 'All Types'}</span>
                        <span className="text-xs text-yellow-400">Select</span>
                      </li>
                    ))}
                  </motion.ul>,
                  document.body
                )}
              </div>

              {/* PREFIX SEARCH BAR */}
              <div className="relative" ref={prefixRef}>
                <input
                  ref={prefixInputRef}
                  type="text"
                  placeholder="Prefix: APT29, DDoS, 192..."
                  onChange={handlePrefixChange}
                  onKeyDown={handlePrefixKeyDown}
                  className="w-80 bg-white/10 text-gray-100 px-4 py-2.5 rounded-lg pr-11 border border-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-[#0e0f11]/50 transition-all placeholder-gray-500 text-base"
                  style={{ backgroundColor: '#0e1a43ff' }} // Explicit blue for Prefix Search Bar
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
                  className="absolute right-3 top-3 text-blue-400 hover:text-pink-400 cursor-pointer transition-colors opacity-70 hover:opacity-100"
                  size={20}
                />

                {/* DROPDOWN */}
                {prefixMatches.length > 0 && createPortal(
                  <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute mt-1 w-full rounded-xl border border-blue-500/30 bg-[#0f0f11]/95 backdrop-blur-md shadow-2xl text-gray-200 z-[200] max-h-64 overflow-y-auto"
                    style={{
                      top: prefixRef.current?.getBoundingClientRect()?.bottom + window.scrollY,
                      left: prefixRef.current?.getBoundingClientRect()?.left,
                      width: prefixRef.current?.offsetWidth || 320,
                    }}
                  >
                    {prefixMatches.map((m, i) => (
                      <li
                        key={i}
                        className={`px-4 py-3 cursor-pointer text-sm border-b border-white/5 last:border-0 flex items-center justify-between transition-all ${i === selectedIndex ? 'bg-blue-500/30 text-blue-300' : 'hover:bg-blue-500/20'}`}
                        onClick={() => {
                          if (prefixInputRef.current) prefixInputRef.current.value = m;
                          setSearchValue(m);
                          handleSearch(m);
                          setPrefixMatches([]);
                          setSelectedIndex(-1);
                        }}
                      >
                        <span className="font-mono">{m}</span>
                        <span className="text-xs text-blue-400">Click or Enter</span>
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
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 bg-[#141518]/90 rounded-2xl p-6 backdrop-blur-lg border border-cyan-500/20 shadow-lg shadow-cyan-500/10 space-y-6"
          >
            <div className="text-center">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
                className="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 border-cyan-400/50 shadow-xl shadow-pink-500/15"
              >
                <img
                  src="project.jpg"
                  alt="Cyber Threat Team Collage"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <h3 className="text-white font-bold text-2xl tracking-tight">Byte-Sized Security Squad</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-center gap-3 hover:bg-cyan-500/10 p-2 rounded-lg transition-all">
                <span className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"></span>
                <div>
                  <p className="font-semibold text-white">Syeda Aliza Ayaz</p>
                  <p className="text-cyan-400 text-xs">Roll No: CT-24219</p>
                </div>
              </div>
              <div className="flex items-center gap-3 hover:bg-pink-500/10 p-2 rounded-lg transition-all">
                <span className="w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full"></span>
                <div>
                  <p className="font-semibold text-white">Arooj Zahra</p>
                  <p className="text-pink-400 text-xs">Roll No: CT-24215</p>
                </div>
              </div>
              <div className="flex items-center gap-3 hover:bg-yellow-500/10 p-2 rounded-lg transition-all">
                <span className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></span>
                <div>
                  <p className="font-semibold text-white">Syeda Amna Zahid</p>
                  <p className="text-yellow-400 text-xs">Roll No: CT-24217</p>
                </div>
              </div>
            </div>
            {/* Contact Button */}
            <motion.a
              href="https://github.com/Syeda-Aliza-Ayaz/ICTA-Integrated-Cyber-Threat-Analyzer"
              target="_blank"
              whileHover={{ scale: 1.05 }}
              className="block text-center px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 text-sm font-medium flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-300">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Code
            </motion.a>
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
                    <h3 className="text-white font-bold text-lg">IoC Type: {ioc.type.toLowerCase() === 'ip' ? 'IP' : ioc.type.charAt(0).toUpperCase() + ioc.type.slice(1).toLowerCase()}</h3>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-400">
                  <p className="text-cyan-400 font-semibold">IoC: {ioc.ioc}</p>
                  <p>Campaign: "{ioc.threat}"</p>
                  <p>Related IoCs: {ioc.relatedIoCs.slice(0, 3).join(', ')}{ioc.relatedIoCs.length > 3 ? '...' : ''}</p>
                  <p>Confidence: {ioc.confidence_level}%</p>
                  <p>Cluster Size: {ioc.relatedIoCs.length + 1} threats</p>
                  <p>Total {selectedNode.type.toLowerCase() === 'ip' ? 'IP' : selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1).toLowerCase()} threats: {graphData.nodes?.length || 0}</p>
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
              Top 5 {graphMode === 'global' ? 'Global' : selectedType !== 'Filter by Type' ? `${selectedType} Type` : 'Global'} Threats
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topThreats.length > 0 ? (
                topThreats.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-[#1a1b1e]/80 to-[#141518]/80 p-5 rounded-2xl border border-cyan-500/20 backdrop-blur-sm shadow-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-white font-semibold text-lg">{t.ioc}</h4>
                        <p className="text-cyan-400 text-xs">{t.type.toLowerCase() === 'ip' ? 'IP' : t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()}</p>
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
                ))
              ) : (
                <p className="text-gray-500 text-sm col-span-3">No threats available for this type.</p>
              )}
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
              <p className="text-gray-500 text-sm">© 2025 Cyber Team | <a href="https://github.com/Syeda-Aliza-Ayaz/ICTA-Integrated-Cyber-Threat-Analyzer" className="underline text-cyan-400 hover:text-pink-400">GitHub</a></p>
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