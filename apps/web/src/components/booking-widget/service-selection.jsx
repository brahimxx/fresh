'use client';

import { useState, useEffect } from 'react';
import { Search, Check, Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ServiceSelection({ salonId, selected, onSelect }) {
  var [services, setServices] = useState([]);
  var [categories, setCategories] = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState('');
  var [activeCategory, setActiveCategory] = useState(null);
  
  useEffect(function() {
    async function loadServices() {
      try {
        var res = await fetch('/api/widget/' + salonId + '/services');
        if (res.ok) {
          var data = await res.json();
          setServices(data.data.services || []);
          setCategories(data.data.categories || []);
        }
      } catch (error) {
        console.error('Failed to load services:', error);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, [salonId]);
  
  function toggleService(service) {
    var isSelected = selected.some(function(s) { return s.id === service.id; });
    if (isSelected) {
      onSelect(selected.filter(function(s) { return s.id !== service.id; }));
    } else {
      onSelect([...selected, service]);
    }
  }
  
  function isSelected(serviceId) {
    return selected.some(function(s) { return s.id === serviceId; });
  }
  
  // Filter services
  var filteredServices = services.filter(function(service) {
    var matchesSearch = !search || 
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.description?.toLowerCase().includes(search.toLowerCase());
    var matchesCategory = !activeCategory || service.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });
  
  // Group by category
  var groupedServices = {};
  filteredServices.forEach(function(service) {
    var catId = service.category_id || 'uncategorized';
    if (!groupedServices[catId]) {
      groupedServices[catId] = [];
    }
    groupedServices[catId].push(service);
  });
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(function(i) {
            return <Skeleton key={i} className="h-20 w-full" />;
          })}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Services</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose one or more services for your appointment
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            className="pl-10"
          />
        </div>
        
        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={activeCategory === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={function() { setActiveCategory(null); }}
            >
              All
            </Badge>
            {categories.map(function(cat) {
              return (
                <Badge
                  key={cat.id}
                  variant={activeCategory === cat.id ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={function() { setActiveCategory(cat.id); }}
                >
                  {cat.name}
                </Badge>
              );
            })}
          </div>
        )}
        
        {/* Service List */}
        <div className="space-y-2">
          {Object.entries(groupedServices).map(function([catId, catServices]) {
            var category = categories.find(function(c) { return c.id === parseInt(catId); });
            return (
              <div key={catId}>
                {category && !activeCategory && (
                  <h3 className="font-medium text-sm text-muted-foreground mb-2 mt-4">
                    {category.name}
                  </h3>
                )}
                <div className="space-y-2">
                  {catServices.map(function(service) {
                    var selected = isSelected(service.id);
                    return (
                      <div
                        key={service.id}
                        onClick={function() { toggleService(service); }}
                        className={
                          'p-4 rounded-lg border cursor-pointer transition-all ' +
                          (selected 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'border-gray-200 hover:border-gray-300')
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{service.name}</h4>
                              {selected && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {service.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {service.duration} min
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              ${parseFloat(service.price).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {filteredServices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No services found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
