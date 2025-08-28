import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Button,
  TextField,
  Typography,
  Alert,
  FormControlLabel,
  Switch,
} from "@mui/material";

type SaveResult = "saved" | "noop" | "error";

type SaveRequest = {
  type: "SAVE_REQUEST";
  requestId: string;
};

type SaveResponse = {
  type: "SAVE_RESPONSE";
  requestId: string;
  result: SaveResult;
};

type PostMessageData = SaveRequest | SaveResponse;

const ChildPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedData, setLastSavedData] = useState({
    name: "",
    description: "",
  });
  const [status, setStatus] = useState<string>("");
  const [simulateError, setSimulateError] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  // Check if form is dirty
  const checkIsDirty = useCallback(() => {
    return (
      formData.name !== lastSavedData.name ||
      formData.description !== lastSavedData.description
    );
  }, [formData, lastSavedData]);

  // Update dirty status when form data changes
  useEffect(() => {
    setIsDirty(checkIsDirty());
  }, [checkIsDirty]);

  // Simulate save operation
  const performSave = useCallback(async (): Promise<SaveResult> => {
    if (simulateError) {
      throw new Error("保存処理でエラーが発生しました");
    }

    if (!checkIsDirty()) {
      return "noop";
    }

    // Simulate async save operation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLastSavedData({ ...formData });
    return "saved";
  }, [formData, lastSavedData, simulateError, checkIsDirty]);

  // Handle message from parent
  useEffect(() => {
    const handleMessage = async (event: MessageEvent<PostMessageData>) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === "SAVE_REQUEST") {
        const request = event.data;
        setRequestCount((prev) => prev + 1);
        setStatus(
          `保存リクエストを受信しました (Request ID: ${request.requestId})`
        );

        try {
          const result = await performSave();

          const response: SaveResponse = {
            type: "SAVE_RESPONSE",
            requestId: request.requestId,
            result,
          };

          // Send response back to parent
          if (event.source && "postMessage" in event.source) {
            (event.source as Window).postMessage(response, event.origin);
          }

          const statusMessage =
            result === "saved"
              ? "✅ 保存が完了し、親に通知しました"
              : result === "noop"
              ? "ℹ️ 変更なしを親に通知しました"
              : "❌ エラーを親に通知しました";

          setStatus(statusMessage);
        } catch (error) {
          const response: SaveResponse = {
            type: "SAVE_RESPONSE",
            requestId: request.requestId,
            result: "error",
          };

          if (event.source && "postMessage" in event.source) {
            (event.source as Window).postMessage(response, event.origin);
          }

          setStatus("❌ 保存中にエラーが発生し、親に通知しました");
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [performSave]);

  const handleInputChange =
    (field: "name" | "description") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleManualSave = async () => {
    try {
      setStatus("手動保存中...");
      const result = await performSave();

      const statusMessage =
        result === "saved"
          ? "✅ 手動保存が完了しました"
          : result === "noop"
          ? "ℹ️ 保存する変更がありませんでした"
          : "❌ 保存中にエラーが発生しました";

      setStatus(statusMessage);
    } catch (error) {
      setStatus("❌ 手動保存中にエラーが発生しました");
    }
  };

  return (
    <Container maxWidth="md">
      <Box py={2}>
        <Typography variant="h4" component="h1" gutterBottom>
          子ウィンドウ（画面B）
        </Typography>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            フォーム編集エリア
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            親ウィンドウからのpostMessageを受信して保存処理を実行します。
          </Typography>
        </Box>

        <Box component="form" sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="名前"
            value={formData.name}
            onChange={handleInputChange("name")}
            margin="normal"
            variant="outlined"
          />
          <TextField
            fullWidth
            label="説明"
            value={formData.description}
            onChange={handleInputChange("description")}
            margin="normal"
            variant="outlined"
            multiline
            rows={3}
          />
        </Box>

        <Box display="flex" gap={2} alignItems="center" mb={3}>
          <Button
            variant="contained"
            onClick={handleManualSave}
            disabled={!isDirty}
          >
            手動保存
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={simulateError}
                onChange={(e) => setSimulateError(e.target.checked)}
              />
            }
            label="エラーをシミュレート"
          />
          <Typography
            variant="body2"
            color={isDirty ? "warning.main" : "success.main"}
          >
            {isDirty ? "🔴 未保存の変更があります" : "🟢 保存済み"}
          </Typography>
        </Box>

        {status && (
          <Alert
            severity={
              status.includes("✅")
                ? "success"
                : status.includes("ℹ️")
                ? "info"
                : status.includes("❌")
                ? "error"
                : "info"
            }
            sx={{ mb: 2 }}
          >
            {status}
          </Alert>
        )}

        <Box>
          <Typography variant="h6" gutterBottom>
            統計情報:
          </Typography>
          <Typography variant="body2">
            親からの保存リクエスト受信回数: {requestCount}回
          </Typography>
        </Box>

        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            実装仕様:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>親ウィンドウからのmessageイベントを受信</li>
            <li>SAVE_REQUESTを受信して保存処理を実行</li>
            <li>保存結果をSAVE_RESPONSEで返信</li>
            <li>dirty状態の管理（変更検出）</li>
            <li>イベントリスナーの自動クリーンアップ</li>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default ChildPage;
