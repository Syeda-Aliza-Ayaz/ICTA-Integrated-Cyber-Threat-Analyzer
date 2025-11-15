// src/union_find/union_find.h
#pragma once
#include <string>
#include <unordered_map>
#include <vector>

class UnionFind {
private:
    std::unordered_map<std::string, std::string> parent;
    std::unordered_map<std::string, int> rank;

public:
    UnionFind();
    void makeSet(const std::string& x);
    std::string find(const std::string& x);                    // ← NO const
    void unionSets(const std::string& x, const std::string& y);
    std::vector<std::vector<std::string>> getComponents();     // ← NO const
};