// src/priority_queue/priority_queue.h
#ifndef PRIORITY_QUEUE_H
#define PRIORITY_QUEUE_H

#include <vector>
#include <utility>
#include <string>
#include <algorithm>

struct Threat
{
    int score;
    std::string ioc;

    // For MinHeap: smallest score on top
    bool operator<(const Threat &other) const {
        return score < other.score;
    }
};

class MinHeap
{
private:
    std::vector<Threat> heap;

    void heapifyUp(int idx);
    void heapifyDown(int idx);

public:
    void push(const Threat &t);
    Threat pop();
    std::vector<Threat> getTopK(int k);
    int size() const { return heap.size(); }
    bool empty() const { return heap.empty(); }
    void clear();
};

#endif