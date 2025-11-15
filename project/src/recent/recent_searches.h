#ifndef RECENT_SEARCHES_H
#define RECENT_SEARCHES_H

#include <deque>
#include <string>

class RecentSearches {
private:
    std::deque<std::string> searchHistory;
    size_t capacity;

public:
    RecentSearches(size_t cap = 5); // Declaration only
    void add(const std::string& iocQuery);
    const std::deque<std::string>& getAll() const;
    void displayHistory() const;
    bool isEmpty() const;
    void clear();
};

#endif