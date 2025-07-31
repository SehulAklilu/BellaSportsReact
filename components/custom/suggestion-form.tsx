"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  title: string;
}

interface SuggestionFormProps {
  categories: Category[];
}

// Validation schema matching the backend
const formSchema = z.object({
  nomineeName: z.string().min(3, { message: "Name must be at least 3 characters." }),
  categoryId: z.string().min(1, { message: "Please select a category." })
});

export const SuggestionForm = ({ categories }: SuggestionFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomineeName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Something went wrong.');
      }
      
      toast.success(result.message);
      form.reset(); // Clear the form on success

    } catch (error) { // 'error' is now of type 'unknown'
        if (error instanceof Error) {
            toast.error(error.message); // If it's a standard error, show its message
        } else {
            toast.error("An unexpected error occurred."); // Fallback for other cases
        }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Suggest a Nominee</CardTitle>
        <CardDescription>
          Think someone is missing? Suggest their TikTok account or name below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nomineeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nominee&apos;s Name / TikTok Account</FormLabel>
                  <FormControl>
                    <Input placeholder="@their_tiktok_handle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category for this nominee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Suggestion"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};