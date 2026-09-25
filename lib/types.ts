export type Auction = {
  id: string;
  name: string;
  date: string | null;
  created_at: string;
};

export type Item = {
  id: string;
  lot_no: number | null;
  kategori: string | null;
  baslik: string;
  aciklama: string | null;
  boyut: string | null;
  qr_code: string | null;
  barcode_value: number;
  created_at: string;
};

export type AuctionItem = {
  id: string;
  auction_id: string;
  item_id: string;
  acilis_fiyati: number | null;
  satici_id: number | null;
  satildi_mi: boolean;
  satis_fiyati: number | null;
  created_at: string;
};
