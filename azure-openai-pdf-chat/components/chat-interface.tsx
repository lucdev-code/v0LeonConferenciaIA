"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
// Import the new ErrorMessage component
import { ErrorMessage } from "@/components/error-message"

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: Date
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("message", input)

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      })

      // First check if the response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Error del servidor: ${response.status}`

        try {
          // Try to parse as JSON in case it's a formatted error
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If it's not JSON, use the raw text (truncated if too long)
          errorMessage = errorText.length > 100 ? `${errorText.substring(0, 100)}...` : errorText
        }

        throw new Error(errorMessage)
      }

      // Now try to parse the successful response
      const responseText = await response.text()
      let data

      try {
        data = JSON.parse(responseText)
      } catch (jsonError) {
        console.error("Error parsing JSON response:", jsonError, "Response text:", responseText.substring(0, 200))
        throw new Error(`El servidor devolvió un formato inválido. Por favor, inténtalo de nuevo.`)
      }

      // Find the assistant's response
      const assistantMessage = data.messages?.find((msg: any) => msg.role === "assistant")

      if (assistantMessage) {
        const newMessage: Message = {
          id: assistantMessage.id,
          role: "assistant",
          content: assistantMessage.content[0].text.value,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, newMessage])
      } else {
        throw new Error("No se encontró respuesta del asistente en los datos")
      }
    } catch (error: any) {
      console.error("Error sending message:", error)

      // Add an error message
      const errorMessage: Message = {
        id: "error-" + Date.now().toString(),
        role: "system",
        content: `Error: ${error.message || "Error al enviar el mensaje. Por favor, inténtalo de nuevo."}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])

      setError(error.message || "Error al enviar el mensaje. Por favor, inténtalo de nuevo.")
      toast({
        title: "Error",
        description: error.message || "Error al enviar el mensaje. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setInput("")
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    toast({
      title: "Chat limpiado",
      description: "Se ha borrado el historial de conversación",
    })
  }

  const formatTime = (date?: Date) => {
    if (!date) return ""
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-[70vh]">
      {error && <ErrorMessage message={error} />}

      <Card className="flex-1 mb-4 shadow-lg border-[#d5522b]/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[#d5522b]">Dex Chat</CardTitle>
            <CardDescription>Ask something about web development</CardDescription>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-gray-500 hover:text-[#d5522b] hover:bg-[#d5522b]/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 h-[calc(100%-5rem)] overflow-hidden bg-gray-50/50 rounded-b-lg">
          <ScrollArea className="h-full pr-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="max-w-md space-y-2">
                  <p className="text-lg font-medium">¡Welcome to your AI assistant!</p>
                  <p>Write a question, doubt or something to do</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-4 pb-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col rounded-2xl p-4 max-w-[85%] shadow-sm",
                      message.role === "user"
                        ? "ml-auto bg-[#d5522b] text-white"
                        : message.role === "system"
                          ? "max-w-full bg-yellow-50 border border-yellow-200"
                          : "bg-white border border-gray-100",
                    )}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">
                        {message.role === "user" ? "Tú" : message.role === "system" ? "Sistema" : "Asistente"}
                      </div>
                      {message.timestamp && <div className="text-xs opacity-70">{formatTime(message.timestamp)}</div>}
                    </div>
                    <div className="whitespace-pre-wrap">
                      {message.id.startsWith("processing-") ? (
                        <div className="flex items-center gap-2">
                          {message.content}
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write something..."
          className="flex-1 shadow-md border-[#d5522b]/20 focus-visible:ring-[#d5522b]/30"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading}
          title="Enviar mensaje"
          className="bg-[#d5522b] hover:bg-[#c04826] text-white shadow-md"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  )
}
