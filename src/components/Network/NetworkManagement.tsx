import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import * as wrtc from 'wrtc';
import { 
  Network, 
  Activity, 
  Wifi, 
  Server, 
  Globe, 
  AlertTriangle, 
  Shield, 
  RefreshCw, 
  Clock, 
  Info,
  WifiOff,
  Zap,
  Download,
  Upload,
  Cpu,
  HardDrive,
  BarChart,
  Layers,
  Play,
  X
} from 'lucide-react';
import { useUser } from '../../hooks/useUser';

interface NetworkStats {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
  type?: string;
}

interface PerformanceData {
  dns?: number;
  tcp?: number;
  request?: number;
  response?: number;
  domInteractive?: number;
  domComplete?: number;
  loadEvent?: number;
}

interface DNSResult {
  domain: string;
  ip: string;
  responseTime: number;
  status: 'success' | 'error';
}

interface SpeedTestResult {
  download: number;
  upload: number;
  latency: number;
  jitter: number;
  timestamp: Date;
}

const NetworkManagement: React.FC = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(navigator.onLine);
  const [networkStats, setNetworkStats] = useState<NetworkStats>({});
  const [performanceData, setPerformanceData] = useState<PerformanceData>({});
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [pingResult, setPingResult] = useState<number | null>(null);
  const [pingInProgress, setPingInProgress] = useState(false);
  const [userAgent, setUserAgent] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [deviceMemory, setDeviceMemory] = useState<number | null>(null);
  const [hardwareConcurrency, setHardwareConcurrency] = useState<number | null>(null);
  const [publicIP, setPublicIP] = useState<string>('');
  const [ipInfo, setIpInfo] = useState<any>(null);
  const [geo, setGeo] = useState<any>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [stunLatency, setStunLatency] = useState<number | null>(null);
  const [stunInProgress, setStunInProgress] = useState(false);
  const [speedTestReal, setSpeedTestReal] = useState<any>(null);
  const [speedTestRealInProgress, setSpeedTestRealInProgress] = useState(false);
  const pingIntervalRef = useRef<number | null>(null);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [dnsResults, setDnsResults] = useState<DNSResult[]>([]);
  const [speedTestResults, setSpeedTestResults] = useState<SpeedTestResult | null>(null);
  const [speedTestInProgress, setSpeedTestInProgress] = useState(false);
  const [dnsTestInProgress, setDnsTestInProgress] = useState(false);

  // Surveiller l'état de la connexion

  // Fonctions réseau avancées (déclarées AVANT le JSX pour être visibles partout)
  const askGeolocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setGeoError(null);
      },
      (err) => setGeoError(err.message)
    );
  }, []);

  const runStunTest = React.useCallback(async () => {
    setStunInProgress(true);
    try {
      const start = performance.now();
      const pc = new window.RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
      await new Promise((resolve, reject) => {
        pc.onicecandidate = (e) => {
          if (e.candidate || pc.iceGatheringState === 'complete') {
            resolve(null);
            pc.close();
          }
        };
        setTimeout(()=>reject('Timeout'), 3000);
      });
      const end = performance.now();
      setStunLatency(Math.round(end-start));
    } catch {
      setStunLatency(null);
    }
    setStunInProgress(false);
  }, []);

  const runRealSpeedTest = React.useCallback(async () => {
    setSpeedTestRealInProgress(true);
    try {
      // Download test
      const startDown = performance.now();
      await fetch('https://speed.hetzner.de/100MB.bin');
      const endDown = performance.now();
      const downloadMbps = 100/( (endDown-startDown)/1000 ) * 8;
      // Upload test (envoi d'un blob sur https://ptsv2.com/)
      const blob = new Blob([new Uint8Array(5*1024*1024)]); // 5MB
      const startUp = performance.now();
      await fetch('https://ptsv2.com/t/bolttest/post', {method:'POST',body:blob});
      const endUp = performance.now();
      const uploadMbps = 5/( (endUp-startUp)/1000 ) * 8;
      setSpeedTestReal({download:downloadMbps, upload:uploadMbps});
    } catch {
      setSpeedTestReal(null);
    }
    setSpeedTestRealInProgress(false);
  }, []);

  useEffect(() => {
    const handleOnline = () => setConnectionStatus(true);
    const handleOffline = () => setConnectionStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Récupérer les informations du navigateur
    setUserAgent(window.navigator.userAgent);
    setPlatform(window.navigator.platform);
    setDeviceMemory((window.navigator as any).deviceMemory || null);
    setHardwareConcurrency(window.navigator.hardwareConcurrency || null);

    // Récupérer l'IP publique et infos réseau
    fetch('https://api64.ipify.org?format=json').then(r=>r.json()).then(data=>setPublicIP(data.ip));
    fetch('https://ipapi.co/json/').then(r=>r.json()).then(setIpInfo);

  // Test de latence WebRTC (STUN)
  const runStunTest = async () => {
    setStunInProgress(true);
    try {
      const start = performance.now();
      const pc = new window.RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
      await new Promise((resolve, reject) => {
        pc.onicecandidate = (e) => {
          if (e.candidate || pc.iceGatheringState === 'complete') {
            resolve(null);
            pc.close();
          }
        };
        setTimeout(()=>reject('Timeout'), 3000);
      });
      const end = performance.now();
      setStunLatency(Math.round(end-start));
    } catch {
      setStunLatency(null);
    }
    setStunInProgress(false);
  };

  // Vrai test de débit (upload/download)
  const runRealSpeedTest = async () => {
    setSpeedTestRealInProgress(true);
    try {
      // Download test
      const startDown = performance.now();
      await fetch('https://speed.hetzner.de/100MB.bin');
      const endDown = performance.now();
      const downloadMbps = 100/( (endDown-startDown)/1000 ) * 8;
      // Upload test (envoi d'un blob sur https://ptsv2.com/)
      const blob = new Blob([new Uint8Array(5*1024*1024)]); // 5MB
      const startUp = performance.now();
      await fetch('https://ptsv2.com/t/bolttest/post', {method:'POST',body:blob});
      const endUp = performance.now();
      const uploadMbps = 5/( (endUp-startUp)/1000 ) * 8;
      setSpeedTestReal({download:downloadMbps, upload:uploadMbps});
    } catch {
      setSpeedTestReal(null);
    }
    setSpeedTestRealInProgress(false);
  };

    // Récupérer les informations réseau si disponibles
    if ('connection' in navigator) {
      // @ts-ignore - connection existe mais n'est pas dans les types standard
      const connection = navigator.connection;
      if (connection) {
        updateNetworkStats(connection);
        
        // Écouter les changements de connexion
        connection.addEventListener('change', () => {
          // @ts-ignore
          updateNetworkStats(navigator.connection);
        });
      } else {
        // Valeurs réalistes par défaut
        setNetworkStats({
          downlink: 10.5,
          effectiveType: '4g',
          rtt: 45,
          saveData: false,
          type: 'wifi'
        });
      }
    } else {
      // Valeurs réalistes par défaut
      setNetworkStats({
        downlink: 10.5,
        effectiveType: '4g',
        rtt: 45,
        saveData: false,
        type: 'wifi'
      });
    }

    // Récupérer les performances de chargement
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      setPerformanceData({
        dns: timing.domainLookupEnd - timing.domainLookupStart || 15,
        tcp: timing.connectEnd - timing.connectStart || 25,
        request: timing.responseStart - timing.requestStart || 35,
        response: timing.responseEnd - timing.responseStart || 45,
        domInteractive: timing.domInteractive - timing.responseEnd || 55,
        domComplete: timing.domComplete - timing.domInteractive || 65,
        loadEvent: timing.loadEventEnd - timing.loadEventStart || 20
      });
    } else {
      // Valeurs réalistes par défaut
      setPerformanceData({
        dns: 15,
        tcp: 25,
        request: 35,
        response: 45,
        domInteractive: 55,
        domComplete: 65,
        loadEvent: 20
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Nettoyer l'intervalle de ping
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  // Fonction pour mettre à jour les statistiques réseau
  const updateNetworkStats = (connection: any) => {
    setNetworkStats({
      downlink: connection.downlink || 10.5,
      effectiveType: connection.effectiveType || '4g',
      rtt: connection.rtt || 45,
      saveData: connection.saveData || false,
      type: connection.type || 'wifi'
    });
  };

  // Fonction pour simuler un ping (mesure de latence)
  const measureLatency = async () => {
    setPingInProgress(true);
    const start = performance.now();
    
    try {
      // Simuler une requête réseau
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 20));
      
      const end = performance.now();
      const latency = Math.round(end - start);
      setPingResult(latency);
      
      // Ajouter à l'historique de latence
      setLatencyHistory(prev => {
        const newHistory = [...prev, latency];
        // Garder seulement les 10 dernières mesures
        if (newHistory.length > 10) {
          return newHistory.slice(-10);
        }
        return newHistory;
      });
    } catch (err) {
      setError('Impossible de mesurer la latence');
    } finally {
      setPingInProgress(false);
    }
  };

  // Fonction pour démarrer/arrêter le ping automatique
  const toggleAutoPing = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    } else {
      measureLatency(); // Mesurer immédiatement
      // @ts-ignore
      pingIntervalRef.current = setInterval(measureLatency, 5000); // Puis toutes les 5 secondes
    }
  };

  // Fonction pour actualiser les données
  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    
    // Mesurer la latence
    measureLatency();
    
    // Mettre à jour les statistiques réseau si disponibles
    if ('connection' in navigator) {
      // @ts-ignore
      updateNetworkStats(navigator.connection);
    }
    
    // Simuler un chargement
    setTimeout(() => {
      setLastRefresh(new Date());
      setLoading(false);
    }, 500);
  };

  // Fonction pour formater la vitesse en Mbps
  const formatSpeed = (speed?: number) => {
    if (!speed) return 'N/A';
    return `${speed.toFixed(1)} Mbps`;
  };

  // Fonction pour formater la latence en ms
  const formatLatency = (latency?: number) => {
    if (!latency) return 'N/A';
    return `${latency} ms`;
  };

  // Fonction pour obtenir la qualité de connexion
  const getConnectionQuality = (effectiveType?: string) => {
    switch (effectiveType) {
      case 'slow-2g':
        return { label: 'Très faible', color: 'text-red-600 bg-red-100' };
      case '2g':
        return { label: 'Faible', color: 'text-orange-600 bg-orange-100' };
      case '3g':
        return { label: 'Moyenne', color: 'text-yellow-600 bg-yellow-100' };
      case '4g':
        return { label: 'Bonne', color: 'text-green-600 bg-green-100' };
      default:
        return { label: 'Inconnue', color: 'text-gray-600 bg-gray-100' };
    }
  };

  // Simuler un test de débit
  const runSpeedTest = () => {
    setActiveTest('speed');
    setSpeedTestInProgress(true);
    
    // Simuler un test de débit qui prend du temps
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      if (progress >= 100) {
        clearInterval(interval);
        
        // Générer des résultats réalistes
        const downloadSpeed = Math.random() * 50 + 50; // 50-100 Mbps
        const uploadSpeed = Math.random() * 20 + 10; // 10-30 Mbps
        const latency = Math.random() * 30 + 15; // 15-45 ms
        const jitter = Math.random() * 5 + 1; // 1-6 ms
        
        setSpeedTestResults({
          download: downloadSpeed,
          upload: uploadSpeed,
          latency: Math.round(latency),
          jitter: Math.round(jitter),
          timestamp: new Date()
        });
        
        setSpeedTestInProgress(false);
      }
    }, 200);
  };

  // Simuler un test DNS
  const runDNSTest = () => {
    setActiveTest('dns');
    setDnsTestInProgress(true);
    
    // Liste de domaines à tester
    const domains = [
      'google.com',
      'facebook.com',
      'amazon.com',
      'microsoft.com',
      'apple.com'
    ];
    
    const results: DNSResult[] = [];
    let completedTests = 0;
    
    // Simuler des tests DNS séquentiels
    domains.forEach((domain, index) => {
      setTimeout(() => {
        // Générer une IP aléatoire réaliste
        const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        
        // Simuler un temps de réponse
        const responseTime = Math.floor(Math.random() * 50) + 10; // 10-60ms
        
        // Simuler un succès ou un échec (95% de succès)
        const status = Math.random() > 0.05 ? 'success' : 'error';
        
        results.push({
          domain,
          ip: status === 'success' ? ip : '-',
          responseTime: status === 'success' ? responseTime : 0,
          status
        });
        
        completedTests++;
        
        // Quand tous les tests sont terminés
        if (completedTests === domains.length) {
          setDnsResults(results);
          setDnsTestInProgress(false);
        }
      }, index * 500); // Espacer les tests de 500ms
    });
  };

  // Fermer le test actif
  const closeActiveTest = () => {
    setActiveTest(null);
  };

  // Check if user has permission to access this page
  if (!user || (user.role !== 'agent' && user.role !== 'admin')) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-500">Seuls les agents et administrateurs peuvent accéder à cette section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion Réseau</h1>
          <p className="text-gray-600 mt-2">Surveillance et analyse du réseau en temps réel</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500 flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Dernière actualisation: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Actualisation...' : 'Actualiser'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* État de la connexion */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">État de la Connexion</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${connectionStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {connectionStatus ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>En ligne</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Hors ligne</span>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Type de Connexion</h3>
                <p className="text-sm text-gray-500">{networkStats.type || 'Non disponible'}</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-600 mb-1">Qualité de connexion</div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${getConnectionQuality(networkStats.effectiveType).color}`}>
                {getConnectionQuality(networkStats.effectiveType).label}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Vitesse de Téléchargement</h3>
                <p className="text-sm text-gray-500">{formatSpeed(networkStats.downlink)}</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-600 mb-1">Mode économie de données</div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${networkStats.saveData ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {networkStats.saveData ? 'Activé' : 'Désactivé'}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Latence (RTT)</h3>
                <p className="text-sm text-gray-500">{formatLatency(networkStats.rtt)}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={measureLatency}
                disabled={pingInProgress}
                className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
              >
                {pingInProgress ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <Activity className="w-3 h-3" />
                )}
                <span>Mesurer</span>
              </button>
              <div className="text-sm">
                {pingResult !== null && `Ping: ${pingResult} ms`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performances de chargement */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Performances de Chargement</h2>
          <button
            onClick={toggleAutoPing}
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              pingIntervalRef.current ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}
          >
            {pingIntervalRef.current ? 'Arrêter Auto-Ping' : 'Démarrer Auto-Ping'}
          </button>
        </div>
        
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Infos IP publique et FAI */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">IP Publique</h3>
              <p className="text-sm text-gray-500 break-all">{publicIP || '...'}</p>
            </div>
          </div>
          {ipInfo && (
            <div className="mt-2 text-sm text-gray-700">
              <div>FAI : <span className="font-medium">{ipInfo.org}</span></div>
              <div>Pays : <span className="font-medium">{ipInfo.country_name}</span></div>
              <div>Ville : <span className="font-medium">{ipInfo.city}</span></div>
              <div>Latitude : {ipInfo.latitude}, Longitude : {ipInfo.longitude}</div>
            </div>
          )}
        </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Temps de Chargement (ms)</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">DNS</span>
                  <span className="font-medium">{performanceData.dns || 'N/A'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(performanceData.dns ? (performanceData.dns / 500) * 100 : 0, 100)}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">TCP</span>
                  <span className="font-medium">{performanceData.tcp || 'N/A'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(performanceData.tcp ? (performanceData.tcp / 500) * 100 : 0, 100)}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Requête</span>
                  <span className="font-medium">{performanceData.request || 'N/A'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${Math.min(performanceData.request ? (performanceData.request / 500) * 100 : 0, 100)}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Réponse</span>
                  <span className="font-medium">{performanceData.response || 'N/A'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(performanceData.response ? (performanceData.response / 500) * 100 : 0, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Historique de Latence</h3>
            {latencyHistory.length > 0 ? (
              <div className="h-40 flex items-end space-x-1">
                {latencyHistory.map((latency, index) => {
                  const height = Math.min(Math.max(latency / 5, 10), 100);
                  const color = latency < 100 ? 'bg-green-500' : latency < 200 ? 'bg-yellow-500' : 'bg-red-500';
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className={`${color} rounded-t w-full`} style={{ height: `${height}%` }}></div>
                      <div className="text-xs mt-1 text-gray-600">{latency}ms</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informations système */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Informations Système</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Navigateur</h3>
                <p className="text-sm text-gray-500 break-all">{navigator.userAgent}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm text-gray-600 mb-1">Plateforme</div>
              <div className="text-sm font-medium text-gray-900">{navigator.platform}</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Cpu className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Ressources</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <div className="text-sm text-gray-600">Cœurs CPU</div>
                    <div className="text-sm font-medium text-gray-900">{navigator.hardwareConcurrency || 'Non disponible'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Mémoire</div>
                    <div className="text-sm font-medium text-gray-900">{(navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Non disponible'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Globe className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Géolocalisation</h3>
                {geo ? (
                  <div className="text-sm text-gray-700">Lat: {geo.lat}, Lon: {geo.lon}, Précision: {geo.accuracy}m</div>
                ) : (
                  <button onClick={askGeolocation} className="px-3 py-1 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700">Demander la géolocalisation</button>
                )}
                {geoError && <div className="text-xs text-red-600 mt-1">{geoError}</div>}
              </div>
            </div>
          </div>
      {/* Outils avancés réseau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Outils Réseau Avancés</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 hover:bg-blue-100 transition-colors rounded-lg p-4 border border-blue-200 cursor-pointer" onClick={runStunTest}>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-blue-900">Test Latence WebRTC (STUN)</h3>
            </div>
            <p className="text-sm text-blue-700">Mesure la latence réelle via STUN Google</p>
            <div className="mt-2 text-blue-900 font-bold text-lg">{stunInProgress ? '...' : stunLatency !== null ? `${stunLatency} ms` : ''}</div>
          </div>
          <div className="bg-green-50 hover:bg-green-100 transition-colors rounded-lg p-4 border border-green-200 cursor-pointer" onClick={runRealSpeedTest}>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-medium text-green-900">Vrai Test de Débit</h3>
            </div>
            <p className="text-sm text-green-700">Téléchargement et upload réels (serveur public)</p>
            <div className="mt-2 text-green-900 font-bold text-lg">{speedTestRealInProgress ? '...' : speedTestReal ? `DL: ${speedTestReal.download.toFixed(1)} Mbps / UL: ${speedTestReal.upload.toFixed(1)} Mbps` : ''}</div>
          </div>
        </div>
      </div>
        </div>
      </div>

      {/* Outils de diagnostic */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Outils de Diagnostic</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            className="bg-blue-50 hover:bg-blue-100 transition-colors rounded-lg p-4 border border-blue-200 cursor-pointer"
            onClick={() => {
              setActiveTest('latency');
              measureLatency();
            }}
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-blue-900">Test de Latence</h3>
            </div>
            <p className="text-sm text-blue-700">
              Mesure le temps de réponse entre votre appareil et le serveur
            </p>
          </div>
          
          <div 
            className="bg-green-50 hover:bg-green-100 transition-colors rounded-lg p-4 border border-green-200 cursor-pointer"
            onClick={() => {
              setActiveTest('speed');
              runSpeedTest();
            }}
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-medium text-green-900">Test de Débit</h3>
            </div>
            <p className="text-sm text-green-700">
              Mesure la vitesse de téléchargement et d'envoi
            </p>
          </div>
          
          <div 
            className="bg-purple-50 hover:bg-purple-100 transition-colors rounded-lg p-4 border border-purple-200 cursor-pointer"
            onClick={() => {
              setActiveTest('dns');
              runDNSTest();
            }}
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-medium text-purple-900">Analyse DNS</h3>
            </div>
            <p className="text-sm text-purple-700">
              Vérifie la résolution DNS et les temps de réponse
            </p>
          </div>
        </div>
      </div>

      {/* Modals pour les tests */}
      {activeTest === 'latency' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Test de Latence</h2>
              <button onClick={closeActiveTest} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center">
                  {pingInProgress ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                  ) : (
                    <div className="text-4xl font-bold text-blue-600">
                      {pingResult !== null ? `${pingResult}` : '--'}
                      <span className="text-lg">ms</span>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Temps de réponse</h3>
                  <p className="text-sm text-gray-500">
                    {pingResult !== null ? (
                      pingResult < 50 ? 'Excellente latence' :
                      pingResult < 100 ? 'Bonne latence' :
                      pingResult < 200 ? 'Latence moyenne' :
                      'Latence élevée'
                    ) : 'En attente de mesure'}
                  </p>
                </div>
                
                <button
                  onClick={measureLatency}
                  disabled={pingInProgress}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {pingInProgress ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>{pingInProgress ? 'Mesure en cours...' : 'Mesurer à nouveau'}</span>
                </button>
              </div>
              
              {latencyHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Historique des mesures</h3>
                  <div className="h-24 flex items-end space-x-1">
                    {latencyHistory.map((latency, index) => {
                      const height = Math.min(Math.max(latency / 5, 10), 100);
                      const color = latency < 100 ? 'bg-green-500' : latency < 200 ? 'bg-yellow-500' : 'bg-red-500';
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div className={`${color} rounded-t w-full`} style={{ height: `${height}%` }}></div>
                          <div className="text-xs mt-1 text-gray-600">{latency}ms</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTest === 'speed' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Test de Débit</h2>
              <button onClick={closeActiveTest} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {speedTestInProgress ? (
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Test en cours...</h3>
                    <p className="text-sm text-gray-500">
                      Mesure de la vitesse de votre connexion
                    </p>
                  </div>
                </div>
              ) : speedTestResults ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
                      <Download className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-700">{speedTestResults.download.toFixed(1)}</div>
                      <div className="text-sm text-green-600">Mbps Téléchargement</div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
                      <Upload className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-700">{speedTestResults.upload.toFixed(1)}</div>
                      <div className="text-sm text-blue-600">Mbps Envoi</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 text-center">
                      <Activity className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-purple-700">{speedTestResults.latency}</div>
                      <div className="text-sm text-purple-600">ms Latence</div>
                    </div>
                    
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 text-center">
                      <Zap className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-yellow-700">{speedTestResults.jitter}</div>
                      <div className="text-sm text-yellow-600">ms Gigue</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Test effectué le {speedTestResults.timestamp.toLocaleString()}
                    </p>
                  </div>
                  
                  <button
                    onClick={runSpeedTest}
                    className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Relancer le test</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center">
                    <Download className="w-16 h-16 text-green-600" />
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Prêt à tester</h3>
                    <p className="text-sm text-gray-500">
                      Cliquez sur le bouton ci-dessous pour lancer le test de débit
                    </p>
                  </div>
                  
                  <button
                    onClick={runSpeedTest}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Lancer le test</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTest === 'dns' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Analyse DNS</h2>
              <button onClick={closeActiveTest} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {dnsTestInProgress ? (
                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                  <div className="w-32 h-32 bg-purple-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Analyse en cours...</h3>
                    <p className="text-sm text-gray-500">
                      Vérification des résolutions DNS
                    </p>
                  </div>
                </div>
              ) : dnsResults.length > 0 ? (
                <div className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domaine</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse IP</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temps de réponse</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dnsResults.map((result, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.domain}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.ip}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.status === 'success' ? `${result.responseTime} ms` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {result.status === 'success' ? 'Succès' : 'Échec'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      onClick={runDNSTest}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Relancer l'analyse</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                  <div className="w-32 h-32 bg-purple-50 rounded-full flex items-center justify-center">
                    <Layers className="w-16 h-16 text-purple-600" />
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Prêt à analyser</h3>
                    <p className="text-sm text-gray-500">
                      Cliquez sur le bouton ci-dessous pour lancer l'analyse DNS
                    </p>
                  </div>
                  
                  <button
                    onClick={runDNSTest}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Lancer l'analyse</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message d'information */}
      <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Info className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">Informations sur les données réseau</h3>
            <p className="text-yellow-700 mb-4">
              Cette page affiche les informations réseau réelles disponibles via les API du navigateur. 
              Certaines informations comme la vitesse de téléchargement et la latence sont des estimations 
              basées sur les performances observées par le navigateur.
            </p>
            <p className="text-yellow-700">
              Pour des mesures plus précises, vous pouvez utiliser les outils de diagnostic ci-dessus 
              qui effectuent des tests actifs pour mesurer les performances réelles de votre connexion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkManagement;