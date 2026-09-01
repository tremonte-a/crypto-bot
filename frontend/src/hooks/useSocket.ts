import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export function useSocket(botId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ price: number; timestamp: number }[]>([]);

  useEffect(() => {
    if (!botId) return;
    // Connect to the same host – Socket.io will use the proxied /socket.io path
    const newSocket = io();
    setSocket(newSocket);
    newSocket.emit('subscribe', botId);
    newSocket.on('price', (data) => {
      if (data.botId === botId) {
        setLatestPrice(data.price);
        setPriceHistory(prev => [...prev, { price: data.price, timestamp: data.timestamp }].slice(-200));
      }
    });
    return () => {
      newSocket.disconnect();
    };
  }, [botId]);

  return { socket, latestPrice, priceHistory };
}