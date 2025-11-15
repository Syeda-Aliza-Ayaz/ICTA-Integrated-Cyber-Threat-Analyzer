// project/wasm_engine.cpp
#include <emscripten.h>
#include <string>
#include <vector>
#include <queue>
#include <unordered_set>
#include <iostream>
#include <unordered_map>
#include "graph/graph.h"
#include "cache/lru_cache.h"
#include "recent/recent_searches.h"
#include "nlohmann/json.hpp"
#include "priority_queue/priority_queue.h"
#include "trie/trie.h"

using json = nlohmann::json;

// GLOBALS
std::unordered_map<std::string, json> iocDatabase;
Graph globalGraph;
LRUCache<std::string, json> iocCache(10);
RecentSearches recent(5);
MinHeap threatHeap;
Trie iocTrie;

EMSCRIPTEN_KEEPALIVE
extern "C" void initEngine()
{
    iocDatabase.clear();
    globalGraph.clear();
    iocCache.clear();
    threatHeap.clear();
    iocTrie.clear();
    recent.clear();
    std::cout << "WASM Engine Initialized\n";
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char *searchIoC(const char *ioc_cstr)
{
    static thread_local std::string result = "{}";
    std::string ioc = ioc_cstr;
    recent.add(ioc);

    if (iocCache.contains(ioc))
    {
        result = iocCache.get(ioc).dump();
    }
    else
    {
        auto it = iocDatabase.find(ioc);
        if (it != iocDatabase.end())
        {
            iocCache.put(ioc, it->second);
            result = it->second.dump();
        }
        else
        {
            result = "{}";
        }
    }
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char *getRecentSearchesJSON()
{
    static std::string result;
    json j = json::array();
    for (const auto &s : recent.getAll())
        j.push_back(s);
    result = j.dump();
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char *getFullReportJSON()
{
    static std::string result;
    json report;
    report["timestamp"] = __DATE__ " " __TIME__;
    report["total_iocs"] = globalGraph.size();
    report["cache_size"] = iocCache.size();
    report["recent_searches"] = json::array();
    for (const auto &s : recent.getAll())
        report["recent_searches"].push_back(s);
    report["top_threats"] = json::array();
    auto top = threatHeap.getTopK(5);
    for (const auto &t : top)
    {
        auto it = iocDatabase.find(t.ioc);
        std::string type = (it != iocDatabase.end()) ? it->second["type"] : "Unknown";
        report["top_threats"].push_back({{"ioc", t.ioc}, {"score", t.score}, {"type", type}});
    }
    result = report.dump();
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char *getTopKThreats(int k)
{
    static std::string res;
    json j = json::array();
    auto top = threatHeap.getTopK(k);
    for (const auto &t : top)
    {
        auto it = iocDatabase.find(t.ioc);
        std::string type = (it != iocDatabase.end()) ? it->second["type"] : "Unknown";
        j.push_back({{"ioc", t.ioc}, {"score", t.score}, {"type", type}});
    }
    res = j.dump();
    return res.c_str();
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char *searchPrefix(const char *prefix_c)
{
    static std::string res;
    std::string prefix = prefix_c;
    json j = json::array();
    auto matches = iocTrie.searchPrefix(prefix);
    for (const auto &m : matches)
        j.push_back(m);
    res = j.dump();
    return res.c_str();
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char *getGlobalGraphJSON()
{
    static thread_local std::string result;
    result = globalGraph.getGlobalGraphJSON();
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char *getClusterGraphJSON(const char *root_ioc_cstr)
{
    static thread_local std::string result; // Safe, persistent
    std::string root_ioc = root_ioc_cstr;
    result = globalGraph.getClusterGraphJSON(root_ioc);
    return result.c_str();
}

// EMSCRIPTEN_KEEPALIVE
// extern "C" const char *getTypeGraphJSON(const char *type_cstr)
// {
//     static thread_local std::string result;
//     std::string type = type_cstr;

//     // Get top 10 threats
//     std::vector<std::pair<int, std::string>> topThreats;
//     for (const auto &[ioc, data] : iocDatabase)
//     {
//         if (data.contains("type") && data["type"].get<std::string>() == type)
//         {
//             int score = data.value("score", 0);
//             topThreats.emplace_back(score, ioc);
//         }
//     }
//     std::sort(topThreats.begin(), topThreats.end(), std::greater<>());
//     if (topThreats.size() > 10)
//         topThreats.resize(10);

//     if (topThreats.empty())
//     {
//         result = "{\"nodes\":[], \"links\":[]}";
//         return result.c_str();
//     }

//     std::unordered_set<std::string> topSet;
//     for (const auto &[score, ioc] : topThreats)
//         topSet.insert(ioc);

//     std::unordered_set<std::string> visited;
//     std::queue<std::string> q;
//     for (const auto &[score, ioc] : topThreats)
//     {
//         if (visited.insert(ioc).second)
//         {
//             q.push(ioc);
//         }
//     }

//     nlohmann::json j;
//     j["nodes"] = nlohmann::json::array();
//     j["links"] = nlohmann::json::array();

//     while (!q.empty())
//     {
//         std::string curr = q.front();
//         q.pop();
//         const Node *node = globalGraph.getNodeDetails(curr);
//         std::string nodeType = "Unknown";
//         if (node)
//         {
//             nodeType = node->type;
//             // Normalize to lowercase
//             std::transform(nodeType.begin(), nodeType.end(), nodeType.begin(), ::tolower);
//         }
//         j["nodes"].push_back({{"id", curr},
//                               {"label", curr},
//                               {"type", nodeType},
//                               {"score", node ? node->severity : 0}});

//         auto it = globalGraph.getAdj().find(curr); // ← FIXED
//         if (it == globalGraph.getAdj().end())
//             continue; // ← FIXED

//         for (const std::string &neighbor : it->second)
//         {
//             if (topSet.count(neighbor))
//             {
//                 j["links"].push_back({{"source", curr}, {"target", neighbor}, {"weight", 1}});
//             }
//             if (visited.find(neighbor) == visited.end())
//             {
//                 visited.insert(neighbor);
//                 q.push(neighbor);
//                 const Node *n = globalGraph.getNodeDetails(neighbor);
//                 j["nodes"].push_back({{"id", neighbor},
//                                       {"label", neighbor},
//                                       {"type", n ? n->type : "Unknown"},
//                                       {"score", n ? n->severity : 0}});
//                 j["links"].push_back({{"source", curr}, {"target", neighbor}, {"weight", 1}});
//             }
//         }
//     }

//     result = j.dump();
//     return result.c_str();
// }

EMSCRIPTEN_KEEPALIVE
extern "C" const char *getShortestPath(const char *src_cstr, const char *dst_cstr)
{
    static thread_local std::string res;
    std::string src = src_cstr;
    std::string dst = dst_cstr;
    auto path = globalGraph.shortestPath(src, dst);
    json j = json::array();
    for (const auto &node : path)
        j.push_back(node);
    res = j.dump();
    return res.c_str();
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char *getTopThreatsByType(const char *type_cstr, int k)
{
    static std::string res;
    std::string type = type_cstr;
    json j = json::array();

    // Collect all IoCs of this type
    std::vector<std::pair<int, std::string>> threats;
    for (const auto &[ioc, data] : iocDatabase)
    {
        if (data.contains("type") && data["type"].get<std::string>() == type)
        {
            int score = data.value("score", 0);
            threats.emplace_back(score, ioc);
        }
    }

    // Sort by score descending
    std::sort(threats.begin(), threats.end(), [](const auto &a, const auto &b)
              { return a.first > b.first; });

    // Take top K
    int limit = std::min(k, (int)threats.size());
    for (int i = 0; i < limit; ++i)
    {
        j.push_back({{"ioc", threats[i].second}, {"score", threats[i].first}, {"type", type}});
    }

    res = j.dump();
    return res.c_str();
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char *getTypeGraphJSON(const char *type_cstr)
{
    static thread_local std::string result;
    std::string type = type_cstr;

    nlohmann::json j;
    j["nodes"] = nlohmann::json::array();
    j["links"] = nlohmann::json::array();

    // Collect all nodes of the specified type
    std::unordered_set<std::string> typeNodes;
    for (const auto& [ioc, data] : iocDatabase) {
        if (data.contains("type") && data["type"].get<std::string>() == type) {
            typeNodes.insert(ioc);
            const Node* node = globalGraph.getNodeDetails(ioc);
            j["nodes"].push_back({
                {"id", ioc},
                {"label", ioc},
                {"type", node ? node->type : "Unknown"},
                {"score", node ? node->severity : 0}
            });
        }
    }

    if (typeNodes.empty()) {
        result = "{\"nodes\":[], \"links\":[]}";
        return result.c_str();
    }

    // Add links only between nodes of the same type
    for (const auto& [source, neighbors] : globalGraph.getAdj()) {
        const Node* sourceNode = globalGraph.getNodeDetails(source);
        if (!sourceNode || sourceNode->type != type) continue;

        for (const auto& target : neighbors) {
            const Node* targetNode = globalGraph.getNodeDetails(target);
            if (targetNode && targetNode->type == type && typeNodes.count(source) && typeNodes.count(target)) {
                j["links"].push_back({
                    {"source", source},
                    {"target", target},
                    {"weight", 1}
                });
            }
        }
    }

    result = j.dump();
    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
extern "C" void setOTXData(const char *jsonStr)
{
    std::string jsonString = jsonStr;
    json data;
    try
    {
        data = json::parse(jsonString);
    }
    catch (...)
    {
        std::cout << "setOTXData: JSON parse failed\n";
        return;
    }

    if (!data.contains("results") || !data["results"].is_array())
    {
        std::cout << "setOTXData: Expected JSON object with 'results' array\n";
        return;
    }

    iocDatabase.clear();
    globalGraph.clear();
    threatHeap.clear();
    iocTrie.clear();
    iocCache.clear();

    int count = 0;
    for (const auto& pulse : data["results"])
    {
        if (!pulse.contains("indicators") || !pulse["indicators"].is_array())
            continue;

        for (auto ind : pulse["indicators"])
        {
            if (!ind.contains("ioc"))
                continue;

            std::string ioc = ind["ioc"].get<std::string>();
            std::string type = ind.value("type", "Unknown");
            std::transform(type.begin(), type.end(), type.begin(), ::tolower);
            
            json ind_copy = ind;
            ind_copy["type"] = type;

            int score = ind_copy.value("score", 0);
            std::string threat = ind_copy.value("threat", "Unknown");
            std::vector<std::string> related;
            if (ind_copy.contains("relatedIoCs"))
            {
                for (const auto& r : ind_copy["relatedIoCs"])
                {
                    if (r.is_string())
                        related.push_back(r.get<std::string>());
                }
            }

            globalGraph.addNodeWithDetails(ioc, type, score);
            iocDatabase[ioc] = ind_copy;
            iocCache.put(ioc, ind_copy);
            for (const auto& rel : related)
            {
                globalGraph.addEdge(ioc, rel);
            }
            threatHeap.push({score, ioc});
            iocTrie.insert(ioc);
            count++;
        }
    }
    std::cout << "setOTXData: Loaded " << count << " IoCs\n";
}