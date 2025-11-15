#ifndef GRAPH_H
#define GRAPH_H

#include <unordered_map>
#include <vector>
#include <string>

struct Node {
    std::string ioc;
    std::string type;
    int severity;
};

class Graph {
private:
    std::unordered_map<std::string, std::vector<std::string>> adj;
    std::unordered_map<std::string, Node> nodeData;

public:
    void addNode(const std::string& id);
    void addEdge(const std::string& a, const std::string& b);
    void addNodeWithDetails(const std::string& ioc, const std::string& type, int severity);
    const Node* getNodeDetails(const std::string& ioc) const;
    bool hasNode(const std::string& ioc) const;
    int size() const;
    void display() const;
    std::vector<std::string> bfs(const std::string& start, int maxDepth) const;
    std::vector<std::string> shortestPath(const std::string& src, const std::string& dst) const;
    std::vector<std::string> dfs(const std::string& start) const;
    std::vector<std::string> getAllNodes() const;
    std::vector<std::pair<std::string, std::string>> getAllEdges() const;
    std::string getGlobalGraphJSON() const;
    std::string getClusterGraphJSON(const std::string& root_ioc) const;
    void clear(); // Added
    void removeNode(const std::string& ioc); // Added
    const std::unordered_map<std::string, std::vector<std::string>>& getAdj() const { return adj; }
};

#endif