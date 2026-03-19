"use client";

import { useState, useEffect, useCallback } from "react";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

interface AdminStats {
  totalRooms: number;
  totalPlayers: number;
  connectedSockets: number;
  imageGenerator: {
    todayGenerations: number;
    isCapReached: boolean;
  };
  rooms: Array<{
    roomId: string;
    phase: string;
    playerCount: number;
    round: number;
  }>;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/stats`, {
        headers: {
          Authorization: `Basic ${btoa(`admin:${password}`)}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setAuthenticated(false);
          setError("Invalid password");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, [password]);

  useEffect(() => {
    if (!authenticated) return;
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [authenticated, fetchStats]);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-4">
          <h1 className="text-2xl font-bold text-center">Admin</h1>
          {error && (
            <div className="bg-red-600/20 text-red-300 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password) setAuthenticated(true);
            }}
            placeholder="Admin password"
            className="w-full bg-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-purple-400"
            autoFocus
          />
          <button
            onClick={() => password && setAuthenticated(true)}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">AI Dixit Admin</h1>

      {error && (
        <div className="bg-red-600/20 text-red-300 px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      {stats && (
        <div className="space-y-6">
          {/* Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Rooms" value={stats.totalRooms} />
            <StatCard label="Players" value={stats.totalPlayers} />
            <StatCard label="Sockets" value={stats.connectedSockets} />
            <StatCard
              label="Images Today"
              value={stats.imageGenerator.todayGenerations}
              alert={stats.imageGenerator.isCapReached}
            />
          </div>

          {/* Cap status */}
          {stats.imageGenerator.isCapReached && (
            <div className="bg-red-600/20 text-red-300 px-6 py-4 rounded-xl font-semibold">
              Daily image generation cap reached! New images will show as text cards.
            </div>
          )}

          {/* Room list */}
          <div className="bg-white/5 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Active Rooms</h2>
            {stats.rooms.length === 0 ? (
              <p className="text-white/40">No active rooms</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-left">
                    <th className="pb-2">Room</th>
                    <th className="pb-2">Phase</th>
                    <th className="pb-2">Players</th>
                    <th className="pb-2">Round</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rooms.map((room) => (
                    <tr key={room.roomId} className="border-t border-white/5">
                      <td className="py-2 font-mono text-xs">{room.roomId}</td>
                      <td className="py-2">
                        <span className="bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded text-xs">
                          {room.phase}
                        </span>
                      </td>
                      <td className="py-2">{room.playerCount}</td>
                      <td className="py-2">{room.round}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${
        alert ? "bg-red-600/20 border border-red-500/30" : "bg-white/5"
      }`}
    >
      <div className="text-sm text-white/50">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
