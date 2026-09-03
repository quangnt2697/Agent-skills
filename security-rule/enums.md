# THAM CHIẾU ENUM — Board Session (Security Status)

### 1. MarketID

```protobuf
enum MarketID {
  MARKET_ID_UNSPECIFIED = 0;
  MARKET_ID_BDO = 1;  // HoSE Bond
  MARKET_ID_BDX = 2;  // HNX Gov Bond
  MARKET_ID_DVX = 3;  // HNX Derivative
  MARKET_ID_HCX = 4;  // HNX Corp Bond
  MARKET_ID_RPO = 5;  // HoSE Repo
  MARKET_ID_STO = 6;  // HoSE Stock
  MARKET_ID_STX = 7;  // HNX Listed Stock
  MARKET_ID_UPX = 8;  // HNX UpCoM
}
```

### 2. BoardID

```protobuf
enum BoardID {
  BOARD_ID_UNSPECIFIED = 0;
  BOARD_ID_AL = 1;   // All boards
  BOARD_ID_G1 = 2;   // Lô chẵn (Main) — gộp G1, G7(Buy-in), G3(Post closing)
  BOARD_ID_G2 = 3;
  BOARD_ID_G3 = 4;   // Post closing
  BOARD_ID_G4 = 5;   // Lô lẻ (Odd lot)
  BOARD_ID_G7 = 6;   // Buy-in
  BOARD_ID_G8 = 7;
  BOARD_ID_R1 = 8;
  BOARD_ID_T1 = 9;   // Thoả thuận lô chẵn (regular) — gộp T1, T2, T3
  BOARD_ID_T2 = 10;  // Thoả thuận (pre)
  BOARD_ID_T3 = 11;  // Thoả thuận lô chẵn (post)
  BOARD_ID_T4 = 12;  // Thoả thuận lô lẻ (regular) — gộp T4, T6
  BOARD_ID_T6 = 13;  // Thoả thuận lô lẻ (post)
}
```

**Quy tắc gộp boardId trong Board Event:**

| boardId (lưu DB) | orginal_board_id (gốc từ Sở)               |
|------------------|--------------------------------------------|
| G1 (=2)          | G1(=2), G7(=6) Buy-in, G3(=4) Post closing |
| G4 (=5)          | G4 (=5)                                    |
| T1 (=9)          | T1(=9), T2(=10), T3(=11) Post              |
| T4 (=12)         | T4(=12), T6(=13) Post                      |

### 3. BoardEventID

```protobuf
enum BoardEventID {
  BOARD_EVENT_ID_UNSPECIFIED = 0;
  BOARD_EVENT_ID_AA1 = 1;   // Opening CA Open
  BOARD_EVENT_ID_AB1 = 2;   // Cont.A Open
  BOARD_EVENT_ID_AB2 = 3;   // Board Trading Close
  BOARD_EVENT_ID_AC2 = 4;   // Closing CA Execution
  BOARD_EVENT_ID_AD1 = 5;   // Order Reception Start
  BOARD_EVENT_ID_AD2 = 6;   // CA Execution
  BOARD_EVENT_ID_AE1 = 7;   // Market Halt Release
  BOARD_EVENT_ID_AE8 = 8;   // Market Halt
  BOARD_EVENT_ID_AF1 = 9;   // CA Open after CB
  BOARD_EVENT_ID_AF6 = 10;  // CB Notice
  BOARD_EVENT_ID_AF7 = 11;  // CB Notice Clear
  BOARD_EVENT_ID_AF8 = 12;  // Suspension by CB
  BOARD_EVENT_ID_AQ3 = 13;  // Interface Connection Cut-off ⛔
  BOARD_EVENT_ID_AT6 = 14;  // PLE Notice
  BOARD_EVENT_ID_AW8 = 15;  // Lunch Break
  BOARD_EVENT_ID_AW9 = 16;  // Open after Lunch Break
  BOARD_EVENT_ID_AX1 = 17;  // Board Start
  BOARD_EVENT_ID_BB1 = 18;  // Cont.A Open for Non-PCA
  BOARD_EVENT_ID_BC1 = 19;  // Closing CA Open
  BOARD_EVENT_ID_BE9 = 20;  // Cont.A Open after Market Halt
  BOARD_EVENT_ID_BF9 = 21;  // Cont.A Open after CB
  BOARD_EVENT_ID_CC1 = 22;  // Closing PCA Open
  BOARD_EVENT_ID_CD1 = 23;  // PCA Open
  BOARD_EVENT_ID_CD3 = 24;  // PCA Execution
  BOARD_EVENT_ID_DB2 = 25;
  BOARD_EVENT_ID_DC2 = 26;
  BOARD_EVENT_ID_EI1 = 27;  // Trading Halt Release
  BOARD_EVENT_ID_EI8 = 28;  // Instrument/Product Halt
  BOARD_EVENT_ID_EI9 = 29;  // Cont.A Open after Instr. Halt
  BOARD_EVENT_ID_GT1 = 30;  // GT Order Load
}
```

### 4. TradingSessionID

```protobuf
enum TradingSessionID {
  TRADING_SESSION_ID_UNSPECIFIED = 0;
  TRADING_SESSION_ID_01 = 1;   // GT Order Load
  TRADING_SESSION_ID_10 = 2;   // Opening Call Auction (ATO)
  TRADING_SESSION_ID_11 = 3;   // Opening CA Extension
  TRADING_SESSION_ID_20 = 4;   // Call Auction after Halt
  TRADING_SESSION_ID_21 = 5;   // CA after Halt Extension
  TRADING_SESSION_ID_30 = 6;   // Closing Call Auction (ATC)
  TRADING_SESSION_ID_40 = 7;   // Continuous Auction
  TRADING_SESSION_ID_50 = 8;   // VI Call Auction
  TRADING_SESSION_ID_51 = 9;   // VI CA Extension
  TRADING_SESSION_ID_60 = 10;  // Order Accept Only (Buy-in)
  TRADING_SESSION_ID_70 = 11;
  TRADING_SESSION_ID_80 = 12;  // Periodic Call Auction (PCA)
  TRADING_SESSION_ID_90 = 13;  // Trading Halt
  TRADING_SESSION_ID_99 = 14;  // Board Closing
}
```

### 5. TscProdGrpId

```protobuf
enum TscProdGrpId {
  TSC_PROD_GRP_ID_UNSPECIFIED = 0;
  TSC_PROD_GRP_ID_BDO = 1;  // HoSE Bond
  TSC_PROD_GRP_ID_BDX = 2;  // Gov Bond
  TSC_PROD_GRP_ID_FBX = 3;  // Bond Future
  TSC_PROD_GRP_ID_FIO = 4;  // Index Future
  TSC_PROD_GRP_ID_HCX = 5;  // Corp Bond
  TSC_PROD_GRP_ID_RPO = 6;  // Repo
  TSC_PROD_GRP_ID_STO = 7;  // HoSE Stock
  TSC_PROD_GRP_ID_STX = 8;  // HNX Stock
  TSC_PROD_GRP_ID_UPX = 9;  // UpCoM
}
```

### Mapping MarketID ↔ TscProdGrpId

| MarketID | Enum | TscProdGrpId | Enum  | Ghi chú                            |
|----------|------|--------------|-------|------------------------------------|
| STO      | 6    | STO          | 7     | tscProdGrpId = marketId (cùng tên) |
| STX      | 7    | STX          | 8     | tscProdGrpId = marketId            |
| UPX      | 8    | UPX          | 9     | tscProdGrpId = marketId            |
| DVX      | 3    | **FIO**      | **4** | tscProdGrpId ≠ marketId            |
| DVX      | 3    | **FBX**      | **3** | tscProdGrpId ≠ marketId            |

---
