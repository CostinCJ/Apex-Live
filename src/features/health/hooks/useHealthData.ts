import { useEffect, useRef, useCallback, useState } from 'react';
import { createHealthAdapter } from '@/services/health/HealthAdapter';
import type { IHealthService, Unsubscribe } from '@/services/health/IHealthService';
import type { MetricType, HealthCapabilities } from '@/types/health';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { getHeartRateZone } from '@/types/health';

const OBSERVED_METRICS: MetricType[] = [
  'heart_rate',
  'calories',
  'steps',
  'distance',
];

export function useHealthData() {
  const serviceRef = useRef<IHealthService | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [capabilities, setCapabilities] = useState<HealthCapabilities | null>(null);

  const updateHealthMetrics = useRealtimeStore((s) => s.updateHealthMetrics);

  // Initialize health service
  useEffect(() => {
    const service = createHealthAdapter();
    serviceRef.current = service;

    void (async () => {
      const available = await service.isAvailable();
      setIsAvailable(available);

      if (available) {
        const caps = await service.getCapabilities();
        setCapabilities(caps);
      }
    })();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      void service.stopObserving();
    };
  }, []);

  const requestAndStart = useCallback(async () => {
    const service = serviceRef.current;
    if (!service) return false;

    const result = await service.requestPermissions(OBSERVED_METRICS);
    setHasPermission(result.granted);

    if (!result.granted) return false;

    // Clean up previous subscription before re-subscribing
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to metric updates
    unsubscribeRef.current = service.onMetricUpdate((metric) => {
      switch (metric.type) {
        case 'heart_rate':
          updateHealthMetrics({
            heartRate: metric.value,
            heartRateZone: getHeartRateZone(metric.value),
          });
          break;
        case 'calories':
        case 'active_energy':
          updateHealthMetrics({ caloriesBurned: metric.value });
          break;
        case 'steps':
          updateHealthMetrics({ steps: metric.value });
          break;
        case 'distance':
          // Forward distance data (store can be extended to include it)
          break;
      }
    });

    await service.startObserving(OBSERVED_METRICS);
    return true;
  }, [updateHealthMetrics]);

  const stop = useCallback(async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    await serviceRef.current?.stopObserving();
  }, []);

  return {
    isAvailable,
    hasPermission,
    capabilities,
    requestAndStart,
    stop,
  };
}
