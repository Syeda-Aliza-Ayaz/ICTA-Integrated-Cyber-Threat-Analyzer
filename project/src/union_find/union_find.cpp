// src/union_find/union_find.cpp
#include "union_find.h"

UnionFind::UnionFind() {}

void UnionFind::makeSet(const std::string& x) {
    if (parent.find(x) == parent.end()) {
        parent[x] = x;
        rank[x] = 0;
    }
}

std::string UnionFind::find(const std::string& x) {
    makeSet(x);
    if (parent[x] != x) {
        parent[x] = find(parent[x]);
    }
    return parent[x];
}

void UnionFind::unionSets(const std::string& x, const std::string& y) {
    std::string px = find(x);
    std::string py = find(y);
    if (px == py) return;
    if (rank[px] < rank[py]) std::swap(px, py);
    parent[py] = px;
    if (rank[px] == rank[py]) rank[px]++;
}

std::vector<std::vector<std::string>> UnionFind::getComponents() {
    std::unordered_map<std::string, std::vector<std::string>> clusters;
    for (const auto& p : parent) {
        std::string root = find(p.first);
        clusters[root].push_back(p.first);
    }
    std::vector<std::vector<std::string>> result;
    for (auto& p : clusters) {
        result.push_back(std::move(p.second));
    }
    return result;
}