#include "graph.h"
#include <iostream>
#include <queue>
#include <set>
#include <algorithm>
#include <unordered_set>
#include <functional>
#include "nlohmann/json.hpp"

void Graph::addNode(const std::string& id) {
    if (adj.find(id) == adj.end()) {
        adj[id] = std::vector<std::string>();
    }
}

void Graph::addEdge(const std::string& a, const std::string& b) {
    addNode(a);
    addNode(b);
    adj[a].push_back(b);
    adj[b].push_back(a); // undirected
}

void Graph::addNodeWithDetails(const std::string& ioc, const std::string& type, int severity) {
    addNode(ioc);
    Node node;
    node.ioc = ioc;
    node.type = type;
    node.severity = severity;
    nodeData[ioc] = node;
}

const Node* Graph::getNodeDetails(const std::string& ioc) const {
    auto it = nodeData.find(ioc);
    return (it != nodeData.end()) ? &it->second : nullptr;
}

bool Graph::hasNode(const std::string& ioc) const {
    return adj.find(ioc) != adj.end();
}

int Graph::size() const {
    return adj.size();
}

void Graph::display() const {
    std::cout << "\n==============================\n";
    std::cout << " THREAT GRAPH STRUCTURE\n";
    std::cout << "==============================\n";
    for (const auto& [id, neighbors] : adj) {
        std::cout << "- " << id;
        const Node* node = getNodeDetails(id);
        if (node) {
            std::cout << " [" << node->type << ", S:" << node->severity << "]";
        }
        if (!neighbors.empty()) {
            std::cout << " -> ";
            for (size_t i = 0; i < neighbors.size(); ++i) {
                std::cout << neighbors[i];
                if (i < neighbors.size() - 1) std::cout << ", ";
            }
        }
        std::cout << "\n";
    }
}

std::vector<std::string> Graph::bfs(const std::string& start, int maxDepth) const {
    std::vector<std::string> result;
    if (!hasNode(start)) return result;
    std::unordered_set<std::string> visited;
    std::queue<std::pair<std::string, int>> q;
    q.push({start, 0});
    visited.insert(start);
    while (!q.empty()) {
        auto [node, depth] = q.front(); q.pop();
        result.push_back(node);
        if (depth >= maxDepth) continue;
        auto it = adj.find(node);
        if (it == adj.end()) continue;
        for (const std::string& neighbor : it->second) {
            if (visited.find(neighbor) == visited.end()) {
                visited.insert(neighbor);
                q.push({neighbor, depth + 1});
            }
        }
    }
    return result;
}

std::vector<std::string> Graph::shortestPath(const std::string& src, const std::string& dst) const {
    if (!hasNode(src) || !hasNode(dst)) return {};
    std::unordered_map<std::string, std::string> parent;
    std::unordered_set<std::string> visited;
    std::queue<std::string> q;
    q.push(src);
    visited.insert(src);
    parent[src] = "";
    while (!q.empty()) {
        std::string node = q.front(); q.pop();
        if (node == dst) {
            std::vector<std::string> path;
            std::string curr = dst;
            while (!curr.empty()) {
                path.push_back(curr);
                curr = parent[curr];
            }
            std::reverse(path.begin(), path.end());
            return path;
        }
        auto it = adj.find(node);
        if (it == adj.end()) continue;
        for (const std::string& neighbor : it->second) {
            if (visited.find(neighbor) == visited.end()) {
                visited.insert(neighbor);
                parent[neighbor] = node;
                q.push(neighbor);
            }
        }
    }
    return {};
}

std::vector<std::string> Graph::dfs(const std::string& start) const {
    std::vector<std::string> result;
    std::unordered_set<std::string> visited;
    std::function<void(const std::string&)> dfsHelper = [&](const std::string& node) {
        visited.insert(node);
        result.push_back(node);
        auto it = adj.find(node);
        if (it == adj.end()) return;
        for (const std::string& neighbor : it->second) {
            if (visited.find(neighbor) == visited.end()) {
                dfsHelper(neighbor);
            }
        }
    };
    if (hasNode(start)) {
        dfsHelper(start);
    }
    return result;
}

std::vector<std::string> Graph::getAllNodes() const {
    std::vector<std::string> nodes;
    nodes.reserve(adj.size());
    for (const auto& p : adj) {
        nodes.push_back(p.first);
    }
    return nodes;
}

std::vector<std::pair<std::string, std::string>> Graph::getAllEdges() const {
    std::vector<std::pair<std::string, std::string>> edges;
    std::set<std::pair<std::string, std::string>> seen;
    for (const auto& [u, neighbors] : adj) {
        for (const std::string& v : neighbors) {
            std::string a = u < v ? u : v;
            std::string b = u < v ? v : u;
            if (seen.insert({a, b}).second) {
                edges.emplace_back(a, b);
            }
        }
    }
    return edges;
}

std::string Graph::getGlobalGraphJSON() const {
    nlohmann::json j;
    j["nodes"] = nlohmann::json::array();
    j["links"] = nlohmann::json::array();
    for (const auto& [id, _] : adj) {
        const Node* node = getNodeDetails(id);
        j["nodes"].push_back({
            {"id", id},
            {"label", id},
            {"type", node ? node->type : "Unknown"},
            {"score", node ? node->severity : 0}
        });
    }
    auto edges = getAllEdges();
    for (const auto& [a, b] : edges) {
        j["links"].push_back({
            {"source", a},
            {"target", b},
            {"weight", 1}
        });
    }
    return j.dump();
}

std::string Graph::getClusterGraphJSON(const std::string& root_ioc) const {
    if (!hasNode(root_ioc)) {
        return "{\"nodes\":[], \"links\":[]}";
    }
    nlohmann::json j;
    j["nodes"] = nlohmann::json::array();
    j["links"] = nlohmann::json::array();
    std::unordered_set<std::string> visited;
    std::queue<std::string> q;
    q.push(root_ioc);
    visited.insert(root_ioc);
    while (!q.empty()) {
        std::string curr = q.front(); q.pop();
        const Node* node = getNodeDetails(curr);
        j["nodes"].push_back({
            {"id", curr},
            {"label", curr},
            {"type", node ? node->type : "Unknown"},
            {"score", node ? node->severity : 0}
        });
        auto it = adj.find(curr);
        if (it == adj.end()) continue;
        for (const auto& neighbor : it->second) {
            if (visited.find(neighbor) == visited.end()) {
                visited.insert(neighbor);
                q.push(neighbor);
                j["links"].push_back({
                    {"source", curr},
                    {"target", neighbor},
                    {"weight", 1}
                });
            }
        }
    }
    return j.dump();
}

void Graph::clear() {
    adj.clear();
    nodeData.clear();
}

void Graph::removeNode(const std::string& ioc) {
    if (!hasNode(ioc)) return;
    // Remove edges to this node
    for (auto& [node, neighbors] : adj) {
        neighbors.erase(
            std::remove(neighbors.begin(), neighbors.end(), ioc),
            neighbors.end()
        );
    }
    // Remove the node itself
    adj.erase(ioc);
    nodeData.erase(ioc);
}