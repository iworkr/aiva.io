import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faq } from "@/data/anon/faq";
import Icons from "../icons";
import TitleBlock from "../title-block";

export default function FAQ() {
  return (
    <section className="py-16 px-6 flex flex-col justify-center items-center space-y-6 max-w-6xl mx-auto">
      <TitleBlock
        icon={<Icons.questionMark />}
        section="FAQ"
        title="Frequently Asked Questions"
        subtitle="Get detailed answers to common inquiries. Enhance your understanding of our offerings and policies."
      />
      <Accordion
        type="single"
        collapsible
        className="w-full max-w-3xl"
      >
        {faq.map((item, i) => (
          <AccordionItem key={i} value={`item-${i + 1}`}>
            <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
