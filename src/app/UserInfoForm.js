'use client';

import { useState } from 'react';

export function UserInfoForm({ userInfo, setUserInfo, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-primary-orange">Tell Santa About Yourself!</h2>
        <p className="text-sm text-gray-600">Santa needs to know a little about you before the chat</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Your name"
          className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-orange/50"
          value={userInfo.name}
          onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Your age"
          className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-orange/50"
          value={userInfo.age}
          onChange={(e) => setUserInfo(prev => ({ ...prev, age: e.target.value }))}
        />
      </div>

      <select
        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-orange/50"
        value={userInfo.gender}
        onChange={(e) => setUserInfo(prev => ({ ...prev, gender: e.target.value }))}
      >
        <option value="unknown">Select gender</option>
        <option value="male">Boy</option>
        <option value="female">Girl</option>
        <option value="other">Other</option>
      </select>

      <textarea
        placeholder="Tell Santa about your family (e.g., I live with mom, dad, and my little sister Sarah)"
        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-orange/50 min-h-[80px]"
        value={userInfo.family_details}
        onChange={(e) => setUserInfo(prev => ({ ...prev, family_details: e.target.value }))}
      />

      <textarea
        placeholder="What are your interests? (e.g., I love dinosaurs, playing soccer, and building with blocks)"
        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-orange/50 min-h-[80px]"
        value={userInfo.interests}
        onChange={(e) => setUserInfo(prev => ({ ...prev, interests: e.target.value }))}
      />

      <textarea
        placeholder="What would you like for Christmas?"
        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-orange/50 min-h-[80px]"
        value={userInfo.gift_wishes}
        onChange={(e) => setUserInfo(prev => ({ ...prev, gift_wishes: e.target.value }))}
      />
    </div>
  );
}
