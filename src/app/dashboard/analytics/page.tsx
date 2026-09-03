"use client";

import { BarChart3, LineChart as LineChartIcon, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const data = [
  { name: 'Mon', chats: 40 },
  { name: 'Tue', chats: 30 },
  { name: 'Wed', chats: 45 },
  { name: 'Thu', chats: 50 },
  { name: 'Fri', chats: 65 },
  { name: 'Sat', chats: 85 },
  { name: 'Sun', chats: 70 },
];

const questionData = [
  { name: 'Timings', count: 45 },
  { name: 'Fees', count: 35 },
  { name: 'Location', count: 25 },
  { name: 'Doctors', count: 20 },
  { name: 'Other', count: 10 },
];

export default function AnalyticsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Analytics</h2>
        <p className="text-text-secondary">See how your AI agent is performing.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-text-secondary text-sm mb-1">Total Chats This Month</p>
          <p className="text-3xl font-bold text-primary">385</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-text-secondary text-sm mb-1">Average Response Time</p>
          <p className="text-3xl font-bold text-primary">&lt; 2s</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-text-secondary text-sm mb-1">Automated Resolution</p>
          <p className="text-3xl font-bold text-primary">94%</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <LineChartIcon className="w-5 h-5 text-text-secondary" />
            <h3 className="font-bold">Chats per day — Last 7 days</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px' }}
                  itemStyle={{ color: '#16a34a' }}
                />
                <Line type="monotone" dataKey="chats" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-text-secondary" />
            <h3 className="font-bold">Top 5 Questions Asked</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={questionData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px' }}
                  itemStyle={{ color: '#7c3aed' }}
                  cursor={{ fill: '#ffffff10' }}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
