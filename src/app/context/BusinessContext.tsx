"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type BusinessData = {
  name: string;
  type: string;
  city: string;
  phone: string;
  language: string;
  hours: string;
  services: any[]; // Used for Class Fees in Education
  faq: any[];
  rules: string;
  agentName: string;
  welcomeMessage: string;
  tone: string;
  // Education Specific
  students?: any[];
  attendanceSheetId?: string;
  feeSheetId?: string;
};

const defaultData: BusinessData = {
  name: "Elite Academy",
  type: "education",
  city: "Karachi",
  phone: "0300-1112223",
  language: "english",
  hours: "Monday - Friday: 8 AM - 2 PM\nSaturday: 8 AM - 12 PM\nSunday: Closed",
  services: [
    { name: "Grade 9 Monthly Fee", price: "Rs. 5000" },
    { name: "Grade 10 Monthly Fee", price: "Rs. 6000" },
    { name: "Registration Fee", price: "Rs. 2000" }
  ],
  faq: [
    { q: "How to check student attendance?", a: "Parents receive a WhatsApp notification if a student is absent." },
    { q: "Where can I find the fee voucher?", a: "Vouchers are sent via WhatsApp and are available in the student portal." }
  ],
  rules: "Maintain strict discipline. Absents must be reported by 9 AM.",
  agentName: "Academy Assistant",
  welcomeMessage: "Welcome to Elite Academy! How can I assist you with student records or fees today? 🎓",
  tone: "professional",
  students: [],
  attendanceSheetId: "",
  feeSheetId: ""
};

type BusinessContextType = {
  data: BusinessData;
  updateData: (updates: Partial<BusinessData>) => void;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BusinessData>(defaultData);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('agentify_business_data');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {}
    }
    setMounted(true);
  }, []);

  const updateData = (updates: Partial<BusinessData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };
      sessionStorage.setItem('agentify_business_data', JSON.stringify(newData));
      return newData;
    });
  };

  return (
    <BusinessContext.Provider value={{ data, updateData }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
