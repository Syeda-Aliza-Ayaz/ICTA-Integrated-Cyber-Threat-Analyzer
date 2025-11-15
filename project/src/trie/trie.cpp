#include "trie.h"

Trie::Trie() { root = new TrieNode(); }
Trie::~Trie() { clear(); }

void Trie::insert(const std::string& word) {
    TrieNode* node = root;
    for (char c : word) {
        if (!node->children.count(c)) {
            node->children[c] = new TrieNode();
        }
        node = node->children[c];
    }
    node->isEnd = true;
}

void Trie::collect(TrieNode* node, std::string prefix, std::vector<std::string>& result) {
    if (node->isEnd) result.push_back(prefix);
    for (auto& p : node->children) {
        collect(p.second, prefix + p.first, result);
    }
}

std::vector<std::string> Trie::searchPrefix(const std::string& prefix) {
    std::vector<std::string> result;
    TrieNode* node = root;
    for (char c : prefix) {
        if (!node->children.count(c)) return result;
        node = node->children[c];
    }
    collect(node, prefix, result);
    return result;
}

void Trie::clear() {
    clearHelper(root);
    delete root;
    root = new TrieNode();
}

void Trie::remove(const std::string& word) {
    removeHelper(root, word, 0);
}