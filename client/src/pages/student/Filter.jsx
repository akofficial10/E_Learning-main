import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import React, { useState } from "react";

const categories = [
  { id: "neet physics", label: "Neet Physics" },
  { id: "neet chemistry", label: "Neet Chemistry" },
  { id: "neet biology", label: "Neet Biology" },
  { id: "mock series", label: "Mock Series" },
];

const Filter = ({ handleFilterChange }) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortByPrice, setSortByPrice] = useState("");

  /*const handleCategoryChange = (categoryId , checked) => {
    setSelectedCategories((prevCategories) => {
      const newCategories = prevCategories.includes(categoryId)
        ? prevCategories.filter((id) => id !== categoryId)
        : [...prevCategories, categoryId];

        handleFilterChange(newCategories, sortByPrice);
        return newCategories;
    });
  };*/

  const handleCategoryChange = (categoryId, checked) => {
  const newCategories = checked
    ? [...selectedCategories, categoryId]
    : selectedCategories.filter((id) => id !== categoryId);
  /*console.log("Rendering Filter categories:", newCategories);*/
  setSelectedCategories(newCategories);
  handleFilterChange(newCategories, sortByPrice);
  };


  const selectByPriceHandler = (selectedValue) => {
    setSortByPrice(selectedValue);
    handleFilterChange(selectedCategories, selectedValue);
  }

  return (
    <div className="w-full md:w-[20%]">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-lg md:text-xl">Filter Options</h1>
        <Select onValueChange={selectByPriceHandler}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sort by price</SelectLabel>
              <SelectItem value="low">Low to High</SelectItem>
              <SelectItem value="high">High to Low</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Separator className="my-4" />
      <div>
        <h1 className="font-semibold mb-2">CATEGORY</h1>
        {categories.map((category) => (
          <div key={category.id} className="flex items-center space-x-2 my-2">
            <Checkbox
              id={category.id}
              checked={selectedCategories.includes(category.id)}
              onCheckedChange={(checked) => handleCategoryChange(category.id , checked)}
            />
            <Label htmlFor={category.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {category.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Filter;
