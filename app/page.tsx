'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRestaurantStore, Restaurant } from './store';
import { Plus, Search, MapPin, Trash2, Utensils, Pencil, Link as LinkIcon, Check, X, Camera, RefreshCw } from 'lucide-react';


import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useJsApiLoader } from '@react-google-maps/api';
import { toast } from 'sonner';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

const mapCategory = (naverCategory: string): string => {
  if (!naverCategory) return '기타';
  if (naverCategory.includes('한식')) return '한식';
  if (naverCategory.includes('중식')) return '중식';
  if (naverCategory.includes('양식') || naverCategory.includes('피자') || naverCategory.includes('파스타')) return '양식';
  if (naverCategory.includes('일식') || naverCategory.includes('초밥') || naverCategory.includes('돈가스')) return '일식';
  if (naverCategory.includes('베이커리') || naverCategory.includes('빵')) return '빵집';
  if (naverCategory.includes('카페') || naverCategory.includes('디저트')) return '디저트';
  if (naverCategory.includes('퓨전')) return '퓨전';
  return '기타';
};

const categoryColors: Record<string, string> = {
  '한식': '#f59e0b',
  '중식': '#ef4444',
  '양식': '#3b82f6',
  '일식': '#10b981',
  '퓨전': '#8b5cf6',
  '빵집': '#d97706',
  '디저트': '#ec4899',
  '기타': '#94a3b8',
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [url, setUrl] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndY.current = 0;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    // If we didn't move much (Tap), treat as toggle
    if (!touchStartY.current || touchEndY.current === 0) {
      // It was a tap (no move) or very small move that didn't trigger onTouchMove significantly?
      // Actually onTouchMove fires even for small moves. 
      // Better logic: calculate distance. If touchEndY is 0, it means no move = Tap.
      // However, we need to be careful.
      if (e.cancelable) e.preventDefault();
      setIsExpanded(!isExpanded);
      return;
    }

    const distance = touchStartY.current - touchEndY.current;

    // Reset for next time
    const start = touchStartY.current;
    const end = touchEndY.current;
    touchStartY.current = 0;
    touchEndY.current = 0;

    // Tap detection (Threshold 10px)
    if (Math.abs(start - end) < 10) {
      if (e.cancelable) e.preventDefault();
      setIsExpanded(!isExpanded);
      return;
    }

    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isUpSwipe) {
      if (e.cancelable) e.preventDefault();
      setIsExpanded(true);
    } else if (isDownSwipe) {
      if (e.cancelable) e.preventDefault();
      setIsExpanded(false);
    }
    // If between 10 and 50, do nothing or snap back? Do nothing.
  };






  // Filter states
  const [filterRegion, setFilterRegion] = useState<string>('전체');
  const [filterCategory, setFilterCategory] = useState<string>('전체');

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const { restaurants, addRestaurant, removeRestaurant, updateComment, reorderRestaurants, setSelectedId, fetchRestaurants } = useRestaurantStore();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Extract unique regions and categories for filter dropdowns
  const uniqueRegions = useMemo(() => {
    const regions = new Set(restaurants.map(r => r.region || '기타'));
    return ['전체', ...Array.from(regions).sort()];
  }, [restaurants]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(restaurants.map(r => r.categoryType || '기타'));
    return ['전체', ...Array.from(categories).sort()];
  }, [restaurants]);

  // Filtered restaurants list
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      const matchRegion = filterRegion === '전체' || (r.region || '기타') === filterRegion;
      const matchCategory = filterCategory === '전체' || (r.categoryType || '기타') === filterCategory;
      return matchRegion && matchCategory;
    });
  }, [restaurants, filterRegion, filterCategory]);

  const handleEdit = (id: string, currentComment: string) => {
    setEditingId(id);
    setEditComment(currentComment);
  };

  const saveEdit = (id: string) => {
    updateComment(id, editComment);
    setEditingId(null);
  };

  const handleUpdateInfo = async (id: string, name: string, address: string) => {
    const toastId = toast.loading(`${name} 정보 업데이트 중...`);
    try {
      const res = await fetch('/api/update-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address })
      });

      if (!res.ok) throw new Error('Update failed');

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Optimistic update via generic addRestaurant (upsert)
      const current = restaurants.find(r => r.id === id);
      if (!current) return;

      const updated: Restaurant = {
        ...current,
        status: data.status,
        businessHours: data.businessHours,
        phoneNumber: data.phoneNumber,
        recentVibes: data.recentVibes,
        priceRange: data.priceRange
      };

      addRestaurant(updated);
      toast.success('정보가 업데이트되었습니다!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('업데이트 실패: ' + (e as Error).message, { id: toastId });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        toast.error('이미지 분석 실패: ' + data.error);
        console.error(data.error);
        /* If specific error "No text found", prompt user */
        if (data.error.includes("No text found")) {
          toast.error("정보를 읽을 수 없습니다. 직접 입력해 주세요.");
        }
      } else {
        // Success
        /* 
           Expected format:
           restaurant_name: string
           recommended_menu: string[]
           address: string
           tags: string[]
        */
        if (data.restaurant_name) {
          setUrl(data.restaurant_name);
          toast.success(`'${data.restaurant_name}' 정보를 찾았습니다!`);
        } else {
          toast.info("식당 이름을 찾지 못했습니다. 직접 입력해주세요.");
        }

        let autoComment = "";
        if (data.recommended_menu && data.recommended_menu.length > 0) {
          autoComment += `추천 메뉴: ${data.recommended_menu.join(', ')}\n`;
        }
        if (data.address) {
          autoComment += `주소: ${data.address}\n`;
        }
        if (data.tags && data.tags.length > 0) {
          autoComment += `태그: ${data.tags.join(' ')}\n`;
        }

        if (autoComment) {
          setComment(prev => prev ? prev + '\n' + autoComment : autoComment);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Load Google Maps API for Geocoding access
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const handleAdd = async () => {
    if (!url) return;
    setLoading(true);
    try {
      let query = url;

      // 1. Link parsing
      if (url.startsWith('http')) {
        const metaRes = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
        const metaData = await metaRes.json();
        if (metaData.title) {
          query = metaData.title;
        }
      }

      // 2. Search Naver
      const res = await fetch(`/api/naver?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const name = item.title.replace(/<[^>]*>?/gm, '');

        // 3. Geocoding (Client-side)
        let lat = 37.5665;
        let lng = 126.9780;

        if (isLoaded && window.google) {
          const geocoder = new window.google.maps.Geocoder();
          try {
            const geoRes = await geocoder.geocode({ address: item.roadAddress || item.address });
            if (geoRes.results && geoRes.results.length > 0) {
              const location = geoRes.results[0].geometry.location;
              lat = location.lat();
              lng = location.lng();
            }
          } catch (e) {
            console.error("Geocoding failed:", e);
          }
        }

        const newRestaurant: Restaurant = {
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          category: item.category,
          categoryType: mapCategory(item.category),
          address: item.address,
          roadAddress: item.roadAddress,
          lat: lat,
          lng: lng,
          comment: comment,
          region: item.address.split(' ')[0] || '기타',
          link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + (item.roadAddress || item.address))}`
        };

        addRestaurant(newRestaurant);
        setSelectedId(newRestaurant.id); // Auto focus on add
        setUrl('');
        setComment('');
      } else {
        toast.error(`'${query}' 결과를 찾을 수 없습니다. 직접 이름을 입력해 보세요.`);
      }
    } catch (error) {
      console.error(error);
      toast.error('데이터 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const groupedRestaurants = useMemo(() => {
    const groups: Record<string, Restaurant[]> = {};
    filteredRestaurants.forEach((r) => {
      const reg = r.region || '기타';
      if (!groups[reg]) groups[reg] = [];
      groups[reg].push(r);
    });
    return groups;
  }, [filteredRestaurants]);

  return (
    <main>
      <MapComponent restaurants={filteredRestaurants} />

      <div
        className={`sidebar glass ${isExpanded ? 'expanded' : ''}`}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <div
          className="sidebar-handle"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={(e) => e.stopPropagation()}
        />
        <header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Utensils size={24} color="var(--primary)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>맛집 저장소</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Filter Section */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <select
                className="input-field"
                style={{ flex: 1, padding: '8px', cursor: 'pointer' }}
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
              >
                {uniqueRegions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              <select
                className="input-field"
                style={{ flex: 1, padding: '8px', cursor: 'pointer' }}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="맛집 이름 또는 링크 입력"
              className="input-field"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <textarea
              placeholder="내 의견"
              className="input-field"
              style={{ height: '60px', resize: 'none' }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              className="btn-primary"
              onClick={handleAdd}
              disabled={loading || isAnalyzing}
            >
              {loading ? '검색 중...' : '맛집 추가하기'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5px' }}>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || isAnalyzing}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--text-muted)',
                  color: 'var(--text-muted)',
                  padding: '8px',
                  width: '100%',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.9rem'
                }}
              >
                {isAnalyzing ? (
                  <span>분석 중... 🤖</span>
                ) : (
                  <>
                    <Camera size={18} />
                    사진으로 자동 완성
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', marginTop: '20px', paddingRight: '5px' }}>
          {isMounted ? (
            <DragDropContext onDragEnd={(result) => {
              if (!result.destination) return;

              const { source, destination } = result;
              const region = source.droppableId;

              if (source.droppableId !== destination.droppableId) {
                // Dragging between regions not supported in this simplified view yet
                // Or implementing basic reorder if regions match
                return;
              }

              const currentGroup = groupedRestaurants[region];
              const items = Array.from(currentGroup);
              const [reorderedItem] = items.splice(source.index, 1);
              items.splice(destination.index, 0, reorderedItem);

              // Reconstruct the full list assuming other regions are unchanged
              const otherRegions = restaurants.filter(r => (r.region || '기타') !== region);
              const newRestaurants = [...otherRegions, ...items];

              // To maintain overall order correctly we might need more complex logic, 
              // but effectively we just need to update the store's order.
              // A safer way: Map the grouped items back to their original positions? 
              // For now, let's just append reordered group to others (simple reorder).
              // Actually, we should probably keep the original order for other groups.

              // Better strategy: Find the indices in the main array?
              // Since we are filtering/grouping, reordering is tricky.
              // Let's rely on constructing a new array where we replace the old group with the new group.

              // Re-sort entire list:
              // 1. Get all items NOT in this region.
              // 2. Get items IN this region in new order.
              // 3. Combine.
              // NOTE: This puts modified region at the end if we just concat. 
              // To preserve "region block" order, we simply filter out the old region and concat.
              // Use store's reorderRestaurants.

              const newFullList = restaurants.filter(r => (r.region || '기타') !== region).concat(items);
              reorderRestaurants(newFullList);
            }}>
              {Object.keys(groupedRestaurants).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                  <Search size={48} style={{ opacity: 0.2, marginBottom: '10px' }} />
                  <p>저장된 맛집이 없습니다.</p>
                </div>
              ) : (
                Object.entries(groupedRestaurants).map(([region, items]) => (
                  <Droppable key={region} droppableId={region}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{ marginBottom: '24px' }}
                      >
                        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px', paddingLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {region}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {items.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="glass"
                                  onClick={() => setSelectedId(item.id)}
                                  style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    userSelect: 'none',
                                    ...provided.draggableProps.style
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <h4 style={{ fontWeight: '600' }}>{item.name}</h4>
                                      <span style={{
                                        fontSize: '0.65rem',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: categoryColors[item.categoryType] || '#94a3b8',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        alignSelf: 'flex-start'
                                      }}>
                                        {item.categoryType || '기타'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <RefreshCw
                                        size={16}
                                        color="#8b5cf6"
                                        style={{ cursor: 'pointer' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateInfo(item.id, item.name, item.roadAddress || item.address);
                                        }}
                                      />
                                      <Pencil
                                        size={16}
                                        color="#94a3b8"
                                        style={{ cursor: 'pointer' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(item.id, item.comment);
                                        }}
                                      />
                                      <LinkIcon
                                        size={16}
                                        color="#3b82f6"
                                        style={{ cursor: 'pointer' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const linkToCopy = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ' ' + (item.roadAddress || item.address))}`;
                                          navigator.clipboard.writeText(linkToCopy);
                                          toast.success('구글 지도 링크가 복사되었습니다!');
                                        }}
                                      />
                                      <Trash2
                                        size={16}
                                        color="#ef4444"
                                        style={{ cursor: 'pointer' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeRestaurant(item.id);
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                    <MapPin size={12} /> {item.roadAddress || item.address}
                                  </p>

                                  {/* AI Info Badge Area */}
                                  {(item.status || item.recentVibes || item.priceRange) && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                      {item.status && (
                                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: item.status.includes('영업 중') ? '#dcfce7' : '#fee2e2', color: item.status.includes('영업 중') ? '#166534' : '#991b1b' }}>
                                          {item.status}
                                        </span>
                                      )}
                                      {item.priceRange && (
                                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#f3f4f6', color: '#374151' }}>
                                          {item.priceRange}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {/* Detailed Info (Hours, Phone, Vibes) */}
                                  {(item.businessHours || item.phoneNumber || item.recentVibes) && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.02)', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
                                      {item.recentVibes && <div style={{ marginBottom: '4px' }}>✨ {item.recentVibes}</div>}
                                      {item.businessHours && <div style={{ marginBottom: '2px' }}>🕒 {item.businessHours}</div>}
                                      {item.phoneNumber && <div>📞 {item.phoneNumber}</div>}
                                    </div>
                                  )}

                                  {editingId === item.id ? (
                                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '8px' }}>
                                      <textarea
                                        value={editComment}
                                        onChange={(e) => setEditComment(e.target.value)}
                                        className="input-field"
                                        style={{
                                          width: '100%',
                                          height: '60px',
                                          fontSize: '0.85rem',
                                          padding: '8px',
                                          marginBottom: '8px'
                                        }}
                                      />
                                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button
                                          onClick={() => setEditingId(null)}
                                          style={{
                                            background: 'transparent',
                                            border: '1px solid var(--text-muted)',
                                            color: 'var(--text-muted)',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem'
                                          }}
                                        >
                                          취소
                                        </button>
                                        <button
                                          onClick={() => saveEdit(item.id)}
                                          style={{
                                            background: 'var(--primary)',
                                            border: 'none',
                                            color: 'white',
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem'
                                          }}
                                        >
                                          저장
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    item.comment && (
                                      <div style={{ padding: '8px 12px', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '8px', fontSize: '0.85rem' }}>
                                        {item.comment}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))
              )}
            </DragDropContext>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>
          )}
        </div>
      </div>
    </main>
  );
}
