#include "../src/graph/graph.h"
#include "../src/union_find/union_find.h"
#include <iostream>
#include <cassert>

void testGraphBasics() {
    std::cout << "\n=== Testing Graph Basics ===" << std::endl;

    Graph g;
    g.addNodeWithDetails("192.168.1.1", "IP", 75);
    g.addNodeWithDetails("malware.com", "Domain", 90);
    g.addNodeWithDetails("abc123hash", "Hash", 60);

    std::cout << "Graph size: " << g.size() << std::endl;
    assert(g.size() == 3);
    assert(g.hasNode("192.168.1.1"));

    std::cout << "[OK] Basic graph operations work!" << std::endl;
}

void testGraphTraversal() {
    std::cout << "\n=== Testing BFS/DFS ===" << std::endl;

    Graph g;
    g.addNode("A");
    g.addNode("B");
    g.addNode("C");
    g.addNode("D");

    g.addEdge("A", "B");
    g.addEdge("B", "C");
    g.addEdge("C", "D");

    auto bfs_result = g.bfs("A");
    auto dfs_result = g.dfs("A");

    std::cout << "BFS from A: ";
    for (const auto& node : bfs_result) {
        std::cout << node << " ";
    }
    std::cout << "\n";

    std::cout << "DFS from A: ";
    for (const auto& node : dfs_result) {
        std::cout << node << " ";
    }
    std::cout << "\n";

    assert(bfs_result.size() == 4);
    assert(dfs_result.size() == 4);

    std::cout << "[OK] BFS and DFS work!" << std::endl;
}

void testUnionFind() {
    std::cout << "\n=== Testing Union-Find Clustering ===" << std::endl;

    UnionFind uf;

    uf.makeSet("IP1");
    uf.makeSet("IP2");
    uf.makeSet("Domain1");
    uf.makeSet("Hash1");

    uf.unite("IP1", "Domain1");
    uf.unite("Domain1", "Hash1");

    assert(uf.connected("IP1", "Hash1"));
    assert(!uf.connected("IP1", "IP2"));

    auto clusters = uf.getClusters();
    std::cout << "Number of clusters: " << clusters.size() << std::endl;

    for (const auto& cluster : clusters) {
        std::cout << "Cluster: ";
        for (const auto& ioc : cluster.second) {
            std::cout << ioc << " ";
        }
        std::cout << "\n";
    }

    std::cout << "[OK] Union-Find clustering works!" << std::endl;
}

void testIntegration() {
    std::cout << "\n=== Testing Graph + Union-Find Integration ===" << std::endl;

    Graph g;
    UnionFind uf;

    // Build threat network
    g.addNodeWithDetails("192.168.1.10", "IP", 85);
    g.addNodeWithDetails("malware.exe", "Hash", 95);
    g.addNodeWithDetails("evil.com", "Domain", 90);

    g.addEdge("192.168.1.10", "malware.exe");
    g.addEdge("malware.exe", "evil.com");

    // Add to union-find
    uf.makeSet("192.168.1.10");
    uf.makeSet("malware.exe");
    uf.makeSet("evil.com");

    uf.unite("192.168.1.10", "malware.exe");
    uf.unite("malware.exe", "evil.com");

    assert(uf.connected("192.168.1.10", "evil.com"));

    std::cout << "[OK] Graph and Union-Find work together!" << std::endl;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "  AROOJ'S GRAPH & CLUSTERING TESTS" << std::endl;
    std::cout << "========================================" << std::endl;

    testGraphBasics();
    testGraphTraversal();
    testUnionFind();
    testIntegration();

    std::cout << "\n========================================" << std::endl;
    std::cout << "   ALL TESTS PASSED SUCCESSFULLY!" << std::endl;
    std::cout << "========================================" << std::endl;

    return 0;
}
