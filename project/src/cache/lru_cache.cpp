// #include "lru_cache.h"
// #include <iostream>

// LRUCache::LRUCache(size_t cap) : capacity(cap) {}

// bool LRUCache::exists(const std::string& ioc) {
//     return cacheMap.find(ioc) != cacheMap.end();
// }

// void LRUCache::put(const std::string& ioc, const IoCRecord& record) {
//     // If already in cache, move to front
//     if (exists(ioc)) {
//         cacheList.erase(cacheMap[ioc]);
//     }
//     else if (cacheList.size() >= capacity) {
//         // Evict least recently used
//         auto last = cacheList.back();
//         cacheMap.erase(last.first);
//         cacheList.pop_back();
//     }
    
//     // Insert new record at front
//     cacheList.push_front({ioc, record});
//     cacheMap[ioc] = cacheList.begin();
// }

// IoCRecord* LRUCache::get(const std::string& ioc) {
//     if (!exists(ioc)) return nullptr;
    
//     // Move accessed item to front
//     auto it = cacheMap[ioc];
//     cacheList.splice(cacheList.begin(), cacheList, it);
//     return &it->second;
// }

// void LRUCache::displayCache() const {
//     std::cout << "\n🧠 Current LRU Cache (most recent first):\n";
//     for (auto& [ioc, rec] : cacheList) {
//         std::cout << " - " << ioc << " (" << rec.severity << ")\n";
//     }
// }

// bool LRUCache::isEmpty() {
//     return cacheMap.empty();
// }

