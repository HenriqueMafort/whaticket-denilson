import path from "path";
import fs from "fs";
import Message from "../../models/Message";
import axios from "axios";
import FormData from "form-data";
import { Transcription } from "openai/resources/audio/transcriptions";

type Response = Transcription | string;

const getPublicFolder = () => {
  return path.resolve(__dirname, "..", "..", "..", "public");
}

const TranscribeAudioMessageToText = async (wid: string, companyId: string): Promise<Response> => {
  try {
    // Busca a mensagem com os detalhes do arquivo de áudio
    const msg = await Message.findOne({
      where: {
        wid: wid,
        companyId: companyId,
      },
    });

    if (!msg) {
      throw new Error("Mensagem não encontrada");
    }

    const data = new FormData();
    let config;

    // Garante que a URL não tenha barra no final para evitar duplicidade
    const baseUrl = process.env.TRANSCRIBE_URL?.replace(/\/$/, "") || "http://localhost:4002";
    const transcribeUrl = `${baseUrl}/transcrever`;

    const authHeader = process.env.TRANSCRIBE_API_KEY
      ? { 'Authorization': `Bearer ${process.env.TRANSCRIBE_API_KEY}` }
      : {};

    // Verifica se a mediaUrl é uma URL válida (armazenamento externo ou URL completa)
    if (msg.mediaUrl.startsWith('http')) {
      // Se for uma URL, usa diretamente
      data.append('url', msg.mediaUrl);
      config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: transcribeUrl,
        headers: {
          ...authHeader,
          ...data.getHeaders(),
        },
        data: data,
      };
    } else {
      // Se não for URL, trata como caminho relativo local
      // Remove possíveis prefixos de porta/host se houver na string
      const fileName = msg.mediaUrl.split('/').pop() || msg.mediaUrl;

      const publicFolder = getPublicFolder();
      const filePath = path.join(publicFolder, `company${companyId}`, fileName);

      if (!fs.existsSync(filePath)) {
        console.error(`[Transcribe] Arquivo não encontrado: ${filePath}`);
        throw new Error(`Arquivo de áudio não encontrado no servidor.`);
      }

      data.append('audio', fs.createReadStream(filePath));
      config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: transcribeUrl,
        headers: {
          ...authHeader,
          ...data.getHeaders(),
        },
        data: data,
      };
    }

    // Faz a requisição para o endpoint
    console.log(`[Transcribe] Iniciando transcrição via: ${transcribeUrl}`);
    const res = await axios.request(config);

    // Tratamento robusto da resposta
    const rawText = typeof res.data === "string"
      ? res.data
      : (res.data?.mensagem || res.data?.erro || JSON.stringify(res.data || ""));

    const text = rawText && rawText.trim().length > 0
      ? rawText
      : "Áudio sem conteúdo reconhecível";

    await msg.update({
      body: text,
      transcrito: true,
    });

    return text;
  } catch (error) {
    console.error("Erro detalhado durante a transcrição:", error?.message || error);
    if (axios.isAxiosError(error)) {
      console.error("Erro Response Data:", error.response?.data);
      console.error("Erro Status:", error.response?.status);
    }
    return "Conversão pra texto falhou. Verifique os logs do backend.";
  }
};

export default TranscribeAudioMessageToText;
