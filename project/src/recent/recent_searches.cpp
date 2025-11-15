#include "recent_searches.h"
#include <iostream>

RecentSearches::RecentSearches(size_t cap) : capacity(cap) {} // Definition here

void RecentSearches::add(const std::string& iocQuery) {
    searchHistory.erase(
        std::remove(searchHistory.begin(), searchHistory.end(), iocQuery),
        searchHistory.end()
    );
    if (searchHistory.size() >= capacity) searchHistory.pop_back();
    searchHistory.push_front(iocQuery);
}

const std::deque<std::string>& RecentSearches::getAll() const {
    return searchHistory;
}

void RecentSearches::displayHistory() const {
    std::cout << "\nRecent Searches:\n";
    int i = 1;
    for (const auto& s : searchHistory)
        std::cout << " " << i++ << ". " << s << "\n";
}

bool RecentSearches::isEmpty() const {
    return searchHistory.empty();
}

void RecentSearches::clear() {
    searchHistory.clear();
}