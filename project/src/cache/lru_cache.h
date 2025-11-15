// src/cache/lru_cache.h
#pragma once
#include <unordered_map>
#include <list>
#include <utility>
#include "nlohmann/json.hpp"

using json = nlohmann::json;

template<typename K, typename V>
class LRUCache {
private:
    size_t capacity;
    std::list<std::pair<K, V>> items;
    std::unordered_map<K, typename std::list<std::pair<K, V>>::iterator> cache;

public:
    explicit LRUCache(size_t cap) : capacity(cap) {}

    bool contains(const K& key) const {
        return cache.find(key) != cache.end();
    }

    V& get(const K& key) {
        auto it = cache.find(key);
        items.splice(items.begin(), items, it->second);
        return it->second->second;
    }

    void put(const K& key, const V& value) {
        if (contains(key)) {
            get(key) = value;
            return;
        }
        if (items.size() >= capacity) {
            auto last = items.back();
            cache.erase(last.first);
            items.pop_back();
        }
        items.emplace_front(key, value);
        cache[key] = items.begin();
    }

    size_t size() const { return items.size(); }

    // ADD THIS METHOD
    void clear() {
        items.clear();
        cache.clear();
    }
};