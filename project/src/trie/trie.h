#ifndef TRIE_H
#define TRIE_H

#include <unordered_map>
#include <vector>
#include <string>

class TrieNode {
public:
    std::unordered_map<char, TrieNode*> children;
    bool isEnd;
    TrieNode() : isEnd(false) {}
    ~TrieNode() {
        for (auto& child : children) {
            delete child.second;
        }
    }
};

class Trie {
private:
    TrieNode* root;

    void clearHelper(TrieNode* node) {
        if (!node) return;
        for (auto& child : node->children) {
            clearHelper(child.second);
            delete child.second;
        }
        node->children.clear();
    }

    void removeHelper(TrieNode* node, const std::string& word, size_t depth) {
        if (!node) return;
        if (depth == word.size()) {
            node->isEnd = false;
            if (node->children.empty()) {
                delete node;
                return;
            }
            return;
        }
        char c = word[depth];
        removeHelper(node->children[c], word, depth + 1);
        if (node->children[c]->children.empty() && !node->children[c]->isEnd) {
            delete node->children[c];
            node->children.erase(c);
        }
    }

public:
    Trie();
    ~Trie();
    void insert(const std::string& word);
    void collect(TrieNode* node, std::string prefix, std::vector<std::string>& result);
    std::vector<std::string> searchPrefix(const std::string& prefix);
    void clear();
    void remove(const std::string& word);
};

#endif